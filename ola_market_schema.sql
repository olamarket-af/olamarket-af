-- =============================================================================
-- O'LA MARKET — SCHÉMA SUPABASE (PostgreSQL) + RLS
-- =============================================================================
-- Ordre d'exécution : à lancer tel quel dans l'éditeur SQL Supabase (ou via
-- `supabase db push` / une migration). Le script est idempotent (IF NOT EXISTS)
-- pour pouvoir être rejoué sans casser un projet existant.
--
-- Rappel métier : O'LA Market ne prend AUCUNE commission sur les ventes.
-- Les revenus viennent des abonnements vendeurs (subscription_plans) et de la
-- publicité (advertising_plans / advertisements) — tous deux configurables
-- par l'admin, jamais codés en dur côté frontend.
-- =============================================================================

create extension if not exists pgcrypto;

-- =============================================================================
-- 1. FONCTIONS UTILITAIRES (updated_at, rôles)
-- =============================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =============================================================================
-- 2. PROFILES (étend auth.users)
-- =============================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  role text not null default 'client' check (role in ('client','vendeur','admin')),
  city text,
  address text,
  status text not null default 'active' check (status in ('active','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Création automatique du profil à l'inscription (Supabase Auth)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, role)
  values (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'phone',
    coalesce(new.raw_user_meta_data->>'role', 'client')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Fonctions de rôle (utilisées par les policies RLS ci-dessous)
create or replace function public.is_admin()
returns boolean language sql stable as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- =============================================================================
-- 3. SELLER_PROFILES (vérification vendeur)
-- =============================================================================

create table if not exists public.seller_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  business_name text,
  verification_status text not null default 'unverified'
    check (verification_status in ('unverified','pending','verified','suspended')),
  verified_at timestamptz,
  created_at timestamptz not null default now()
);

-- =============================================================================
-- 4. STORES (boutiques)
-- =============================================================================

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  slug text not null unique,
  logo_url text,
  cover_url text,
  description text,
  phone text,
  whatsapp text,
  city text,
  address text,
  opening_hours jsonb,
  social_links jsonb,
  status text not null default 'pending' check (status in ('pending','active','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_stores_updated_at on public.stores;
create trigger trg_stores_updated_at
  before update on public.stores
  for each row execute function public.set_updated_at();

create index if not exists idx_stores_seller on public.stores(seller_id);

-- owns_store() a besoin de la table "stores" : définie seulement maintenant
-- qu'elle existe (elle référence public.stores).
create or replace function public.owns_store(p_store_id uuid)
returns boolean language sql stable as $$
  select exists (
    select 1 from public.stores where id = p_store_id and seller_id = auth.uid()
  );
$$;

-- =============================================================================
-- 5. CATEGORIES / SUBCATEGORIES
-- =============================================================================

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  icon text,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.subcategories (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  name text not null,
  slug text not null,
  position int not null default 0,
  created_at timestamptz not null default now(),
  unique (category_id, slug)
);

-- =============================================================================
-- 6. PRODUCTS / PRODUCT_IMAGES
-- =============================================================================

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  category_id uuid references public.categories(id),
  subcategory_id uuid references public.subcategories(id),
  name text not null,
  slug text not null unique,
  description text,
  price numeric(12,2) not null check (price >= 0),
  old_price numeric(12,2),
  stock int not null default 0 check (stock >= 0),
  unit text,
  city text,
  image_url text,
  status text not null default 'draft' check (status in ('draft','active','out_of_stock','suspended')),
  featured boolean not null default false,
  views int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create index if not exists idx_products_store on public.products(store_id);
create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_status on public.products(status);
create index if not exists idx_products_featured on public.products(featured) where featured = true;

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  image_url text not null,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_product_images_product on public.product_images(product_id);

-- =============================================================================
-- 7. FAVORITES
-- =============================================================================

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, product_id)
);

-- =============================================================================
-- 8. CART / CART_ITEMS (uniquement pour utilisateurs connectés —
--    le panier invité reste côté client en localStorage/IndexedDB puis se
--    synchronise ici après connexion)
-- =============================================================================

create table if not exists public.cart (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.cart(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity int not null check (quantity > 0),
  created_at timestamptz not null default now(),
  unique (cart_id, product_id)
);

-- =============================================================================
-- 9. CHECKOUT_GROUPS / ORDERS / ORDER_ITEMS
-- -----------------------------------------------------------------------------
-- Une commande passée par un client peut couvrir plusieurs vendeurs. On
-- regroupe ce panier multi-vendeur dans "checkout_groups" (adresse, total,
-- date communs), et chaque vendeur reçoit sa propre ligne dans "orders"
-- (statut, suivi et RLS indépendants par vendeur).
-- =============================================================================

create table if not exists public.checkout_groups (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  total numeric(12,2) not null default 0,
  address text,
  phone text,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique default ('OLA-' || upper(substr(gen_random_uuid()::text, 1, 8))),
  checkout_group_id uuid references public.checkout_groups(id) on delete set null,
  client_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  store_id uuid not null references public.stores(id) on delete cascade,
  subtotal numeric(12,2) not null default 0,
  address text,
  phone text,
  status text not null default 'pending'
    check (status in ('pending','confirmed','preparing','shipping','delivered','completed','cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create index if not exists idx_orders_client on public.orders(client_id);
create index if not exists idx_orders_seller on public.orders(seller_id);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  quantity int not null check (quantity > 0),
  unit_price numeric(12,2) not null,
  created_at timestamptz not null default now()
);

-- Historique de statut (utile pour "historique" demandé dans le cahier des charges)
create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  status text not null,
  changed_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

-- =============================================================================
-- 10. REVIEWS (avis) — uniquement sur un produit réellement commandé
-- =============================================================================

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid references public.orders(id),
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (user_id, product_id, order_id)
);

create index if not exists idx_reviews_product on public.reviews(product_id);

-- =============================================================================
-- 11. SUBSCRIPTION_PLANS / SUBSCRIPTIONS (abonnements vendeurs)
-- =============================================================================

create table if not exists public.subscription_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  price numeric(12,2) not null,
  currency text not null default 'XOF',
  max_products int, -- null = illimité
  features jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_subscription_plans_updated_at on public.subscription_plans;
create trigger trg_subscription_plans_updated_at
  before update on public.subscription_plans
  for each row execute function public.set_updated_at();

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid not null references public.subscription_plans(id),
  amount numeric(12,2) not null,
  currency text not null default 'XOF',
  start_date timestamptz not null default now(),
  end_date timestamptz not null,
  status text not null default 'pending' check (status in ('pending','active','expired','cancelled')),
  payment_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_subscriptions_seller on public.subscriptions(seller_id);
create index if not exists idx_subscriptions_status on public.subscriptions(status);

-- =============================================================================
-- 12. ADVERTISING_PLANS / ADVERTISEMENTS (publicité vendeur)
-- =============================================================================

create table if not exists public.advertising_plans (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  duration_days int not null,
  price numeric(12,2) not null,
  currency text not null default 'XOF',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.advertisements (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  advertising_plan_id uuid references public.advertising_plans(id),
  product_id uuid references public.products(id) on delete cascade,
  store_id uuid references public.stores(id) on delete cascade,
  type text not null check (type in ('sponsored_product','featured_store','banner','recommended','premium_placement')),
  price numeric(12,2) not null,
  start_date timestamptz,
  end_date timestamptz,
  status text not null default 'pending' check (status in ('pending','active','expired','cancelled')),
  payment_id uuid,
  created_at timestamptz not null default now()
);

create index if not exists idx_ads_seller on public.advertisements(seller_id);
create index if not exists idx_ads_status on public.advertisements(status);

-- =============================================================================
-- 13. PAYMENTS
-- -----------------------------------------------------------------------------
-- Aucune donnée bancaire sensible n'est stockée ici : uniquement la référence
-- renvoyée par le prestataire (MTN MoMo, Moov Money, carte via agrégateur...).
-- =============================================================================

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount numeric(12,2) not null,
  currency text not null default 'XOF',
  purpose text not null check (purpose in ('subscription','advertising','other')),
  reference_id uuid, -- pointe vers subscriptions.id ou advertisements.id selon purpose
  provider text check (provider in ('mtn_momo','moov_money','card','other')),
  provider_reference text,
  status text not null default 'pending' check (status in ('pending','completed','failed','refunded')),
  created_at timestamptz not null default now()
);

alter table public.subscriptions
  add constraint fk_subscriptions_payment
  foreign key (payment_id) references public.payments(id) on delete set null;

alter table public.advertisements
  add constraint fk_advertisements_payment
  foreign key (payment_id) references public.payments(id) on delete set null;

-- =============================================================================
-- 14. NOTIFICATIONS
-- =============================================================================

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null,
  title text not null,
  message text,
  is_read boolean not null default false,
  metadata jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.notifications(user_id, is_read);

-- =============================================================================
-- 15. MESSAGES (conversations client ↔ vendeur)
-- =============================================================================

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  store_id uuid references public.stores(id),
  blocked_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (client_id, seller_id, store_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  content text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_messages_conversation on public.messages(conversation_id);

-- =============================================================================
-- 16. REPORTS (signalements)
-- =============================================================================

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  target_type text not null check (target_type in ('product','seller','comment','message')),
  target_id uuid not null,
  reason text not null,
  description text,
  status text not null default 'pending' check (status in ('pending','reviewed','resolved','dismissed')),
  created_at timestamptz not null default now()
);

-- =============================================================================
-- 17. APP_SETTINGS (configuration admin — jamais de valeurs codées en dur
--     côté frontend : nom du site, PWA, coordonnées, réseaux sociaux...)
-- =============================================================================

create table if not exists public.app_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_app_settings_updated_at on public.app_settings;
create trigger trg_app_settings_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 18. SELLER_STATISTICS — vue calculée en temps réel (plutôt qu'une table à
--     resynchroniser). security_invoker fait respecter les RLS des tables
--     sous-jacentes pour l'utilisateur qui interroge la vue.
-- =============================================================================

create or replace view public.seller_statistics
with (security_invoker = true) as
select
  p.id as seller_id,
  count(distinct pr.id) filter (where pr.status = 'active') as active_products,
  count(distinct pr.id) filter (where pr.status = 'out_of_stock') as out_of_stock_products,
  coalesce(sum(pr.views), 0) as total_views,
  count(distinct f.id) as total_favorites,
  count(distinct o.id) as total_orders,
  coalesce(sum(o.subtotal) filter (where o.status in ('delivered','completed')), 0) as total_sales,
  count(distinct rv.id) as total_reviews,
  coalesce(avg(rv.rating), 0) as average_rating
from public.profiles p
left join public.products pr on pr.seller_id = p.id
left join public.favorites f on f.product_id = pr.id
left join public.orders o on o.seller_id = p.id
left join public.reviews rv on rv.product_id = pr.id
where p.role = 'vendeur'
group by p.id;

-- =============================================================================
-- 19. ACTIVATION RLS
-- =============================================================================

alter table public.profiles enable row level security;
alter table public.seller_profiles enable row level security;
alter table public.stores enable row level security;
alter table public.categories enable row level security;
alter table public.subcategories enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.favorites enable row level security;
alter table public.cart enable row level security;
alter table public.cart_items enable row level security;
alter table public.checkout_groups enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.reviews enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.subscriptions enable row level security;
alter table public.advertising_plans enable row level security;
alter table public.advertisements enable row level security;
alter table public.payments enable row level security;
alter table public.notifications enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.reports enable row level security;
alter table public.app_settings enable row level security;

-- =============================================================================
-- 20. POLICIES
-- =============================================================================

-- ---------- PROFILES ----------
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles_select_public_seller" on public.profiles
  for select using (role = 'vendeur' and status = 'active'); -- affichage vitrine boutique
create policy "profiles_update_own_or_admin" on public.profiles
  for update using (id = auth.uid() or public.is_admin());

-- ---------- SELLER_PROFILES ----------
create policy "seller_profiles_select" on public.seller_profiles
  for select using (true); -- badge "vérifié" public
create policy "seller_profiles_update_own_or_admin" on public.seller_profiles
  for update using (user_id = auth.uid() or public.is_admin());
create policy "seller_profiles_insert_own" on public.seller_profiles
  for insert with check (user_id = auth.uid());

-- ---------- STORES ----------
create policy "stores_select_public" on public.stores
  for select using (status = 'active' or seller_id = auth.uid() or public.is_admin());
create policy "stores_insert_own" on public.stores
  for insert with check (seller_id = auth.uid());
create policy "stores_update_own_or_admin" on public.stores
  for update using (seller_id = auth.uid() or public.is_admin());
create policy "stores_delete_own_or_admin" on public.stores
  for delete using (seller_id = auth.uid() or public.is_admin());

-- ---------- CATEGORIES / SUBCATEGORIES (lecture publique, écriture admin) ----------
create policy "categories_select_public" on public.categories for select using (true);
create policy "categories_write_admin" on public.categories for all
  using (public.is_admin()) with check (public.is_admin());
create policy "subcategories_select_public" on public.subcategories for select using (true);
create policy "subcategories_write_admin" on public.subcategories for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------- PRODUCTS ----------
create policy "products_select_public" on public.products
  for select using (status = 'active' or seller_id = auth.uid() or public.is_admin());
create policy "products_insert_own_store" on public.products
  for insert with check (seller_id = auth.uid() and public.owns_store(store_id));
create policy "products_update_own_or_admin" on public.products
  for update using (seller_id = auth.uid() or public.is_admin());
create policy "products_delete_own_or_admin" on public.products
  for delete using (seller_id = auth.uid() or public.is_admin());

-- ---------- PRODUCT_IMAGES ----------
create policy "product_images_select_public" on public.product_images
  for select using (true);
create policy "product_images_write_owner" on public.product_images
  for all using (
    exists (select 1 from public.products pr where pr.id = product_id and pr.seller_id = auth.uid())
    or public.is_admin()
  );

-- ---------- FAVORITES ----------
create policy "favorites_owner_only" on public.favorites
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ---------- CART / CART_ITEMS ----------
create policy "cart_owner_only" on public.cart
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "cart_items_owner_only" on public.cart_items
  for all using (
    exists (select 1 from public.cart c where c.id = cart_id and c.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.cart c where c.id = cart_id and c.user_id = auth.uid())
  );

-- ---------- CHECKOUT_GROUPS ----------
create policy "checkout_groups_owner_or_admin" on public.checkout_groups
  for select using (client_id = auth.uid() or public.is_admin());
create policy "checkout_groups_insert_own" on public.checkout_groups
  for insert with check (client_id = auth.uid());

-- ---------- ORDERS ----------
create policy "orders_select_client_or_seller_or_admin" on public.orders
  for select using (client_id = auth.uid() or seller_id = auth.uid() or public.is_admin());
create policy "orders_insert_client" on public.orders
  for insert with check (client_id = auth.uid());
create policy "orders_update_seller_or_admin" on public.orders
  for update using (seller_id = auth.uid() or public.is_admin());

-- ---------- ORDER_ITEMS ----------
create policy "order_items_select_via_order" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and (o.client_id = auth.uid() or o.seller_id = auth.uid() or public.is_admin())
    )
  );
create policy "order_items_insert_client" on public.order_items
  for insert with check (
    exists (select 1 from public.orders o where o.id = order_id and o.client_id = auth.uid())
  );

-- ---------- ORDER_STATUS_HISTORY ----------
create policy "order_status_history_select" on public.order_status_history
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id and (o.client_id = auth.uid() or o.seller_id = auth.uid() or public.is_admin())
    )
  );
create policy "order_status_history_insert_seller_or_admin" on public.order_status_history
  for insert with check (
    exists (select 1 from public.orders o where o.id = order_id and (o.seller_id = auth.uid() or public.is_admin()))
  );

-- ---------- REVIEWS ----------
create policy "reviews_select_public" on public.reviews for select using (true);
create policy "reviews_insert_own_if_purchased" on public.reviews
  for insert with check (
    user_id = auth.uid()
    and exists (
      select 1 from public.orders o
      where o.id = order_id and o.client_id = auth.uid() and o.status in ('delivered','completed')
    )
  );
create policy "reviews_update_own" on public.reviews
  for update using (user_id = auth.uid());
create policy "reviews_delete_own_or_admin" on public.reviews
  for delete using (user_id = auth.uid() or public.is_admin());

-- ---------- SUBSCRIPTION_PLANS (lecture publique, écriture admin) ----------
create policy "subscription_plans_select_public" on public.subscription_plans for select using (true);
create policy "subscription_plans_write_admin" on public.subscription_plans for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------- SUBSCRIPTIONS ----------
create policy "subscriptions_select_own_or_admin" on public.subscriptions
  for select using (seller_id = auth.uid() or public.is_admin());
create policy "subscriptions_insert_own" on public.subscriptions
  for insert with check (seller_id = auth.uid());
create policy "subscriptions_update_admin_only" on public.subscriptions
  for update using (public.is_admin());

-- ---------- ADVERTISING_PLANS (lecture publique, écriture admin) ----------
create policy "advertising_plans_select_public" on public.advertising_plans for select using (true);
create policy "advertising_plans_write_admin" on public.advertising_plans for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------- ADVERTISEMENTS ----------
create policy "advertisements_select_own_public_active_or_admin" on public.advertisements
  for select using (status = 'active' or seller_id = auth.uid() or public.is_admin());
create policy "advertisements_insert_own" on public.advertisements
  for insert with check (seller_id = auth.uid());
create policy "advertisements_update_own_or_admin" on public.advertisements
  for update using (seller_id = auth.uid() or public.is_admin());

-- ---------- PAYMENTS ----------
create policy "payments_select_own_or_admin" on public.payments
  for select using (user_id = auth.uid() or public.is_admin());
create policy "payments_insert_own" on public.payments
  for insert with check (user_id = auth.uid());
create policy "payments_update_admin_only" on public.payments
  for update using (public.is_admin());

-- ---------- NOTIFICATIONS ----------
create policy "notifications_owner_only" on public.notifications
  for select using (user_id = auth.uid());
create policy "notifications_update_owner" on public.notifications
  for update using (user_id = auth.uid());
create policy "notifications_insert_admin_or_system" on public.notifications
  for insert with check (public.is_admin() or user_id = auth.uid());

-- ---------- CONVERSATIONS ----------
create policy "conversations_participants_or_admin" on public.conversations
  for select using (client_id = auth.uid() or seller_id = auth.uid() or public.is_admin());
create policy "conversations_insert_client" on public.conversations
  for insert with check (client_id = auth.uid() or seller_id = auth.uid());
create policy "conversations_update_participants" on public.conversations
  for update using (client_id = auth.uid() or seller_id = auth.uid());

-- ---------- MESSAGES ----------
create policy "messages_select_participants" on public.messages
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.client_id = auth.uid() or c.seller_id = auth.uid())
    ) or public.is_admin()
  );
create policy "messages_insert_participants" on public.messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.client_id = auth.uid() or c.seller_id = auth.uid())
      and c.blocked_by is null
    )
  );
create policy "messages_update_recipient_mark_read" on public.messages
  for update using (
    exists (
      select 1 from public.conversations c
      where c.id = conversation_id and (c.client_id = auth.uid() or c.seller_id = auth.uid())
    )
  );

-- ---------- REPORTS ----------
create policy "reports_insert_own" on public.reports
  for insert with check (reporter_id = auth.uid());
create policy "reports_select_own_or_admin" on public.reports
  for select using (reporter_id = auth.uid() or public.is_admin());
create policy "reports_update_admin_only" on public.reports
  for update using (public.is_admin());

-- ---------- APP_SETTINGS (lecture publique, écriture admin) ----------
create policy "app_settings_select_public" on public.app_settings for select using (true);
create policy "app_settings_write_admin" on public.app_settings for all
  using (public.is_admin()) with check (public.is_admin());

-- =============================================================================
-- 21. DONNÉES DE BASE (plans, catégories, réglages) — à ajuster depuis /admin
-- =============================================================================

insert into public.subscription_plans (name, price, currency, max_products, features)
values
  ('basic', 2000, 'XOF', 20, '["Création de boutique","Photos produits","Réception des commandes","Statistiques simples"]'),
  ('standard', 5000, 'XOF', 100, '["Boutique personnalisée","Produits mis en avant","Statistiques avancées","Gestion avancée des commandes"]'),
  ('premium', 10000, 'XOF', null, '["Produits illimités","Visibilité prioritaire","Outils promotionnels","Badge vendeur premium"]')
on conflict (name) do nothing;

insert into public.advertising_plans (label, duration_days, price, currency)
values
  ('Visibilité 7 jours', 7, 5000, 'XOF'),
  ('Visibilité 15 jours', 15, 10000, 'XOF'),
  ('Visibilité 30 jours', 30, 20000, 'XOF')
on conflict do nothing;

insert into public.categories (name, slug, position) values
  ('Téléphones', 'telephones', 1),
  ('Informatique', 'informatique', 2),
  ('Électronique', 'electronique', 3),
  ('Vêtements', 'vetements', 4),
  ('Chaussures', 'chaussures', 5),
  ('Maison', 'maison', 6),
  ('Beauté', 'beaute', 7),
  ('Alimentation', 'alimentation', 8),
  ('Automobile', 'automobile', 9),
  ('Pièces détachées', 'pieces-detachees', 10),
  ('Matériaux', 'materiaux', 11),
  ('Agriculture', 'agriculture', 12),
  ('Services', 'services', 13),
  ('Autres', 'autres', 14)
on conflict (slug) do nothing;

insert into public.app_settings (key, value) values
  ('site_name', '"O''LA Market"'),
  ('slogan', '"Vendez en ligne. Achetez simplement."'),
  ('commission_rate', '0'),
  ('pwa', '{"name":"O''LA Market","short_name":"O''LA Market","theme_color":"#1B2A4A","background_color":"#FBF6EC","install_prompt_enabled":true}')
on conflict (key) do nothing;

-- =============================================================================
-- 22. STORAGE — buckets et policies (Supabase Storage)
-- -----------------------------------------------------------------------------
-- Convention de chemin recommandée : {user_id}/{fichier} pour les buckets privés
-- afin que les policies puissent comparer (storage.foldername(name))[1] à auth.uid().
-- Les buckets doivent être créés une fois via le dashboard Supabase ou l'API
-- Storage (product-images, store-images, profile-images, documents, banners),
-- avec "public" activé pour product-images / store-images / banners et
-- désactivé pour profile-images / documents.
-- =============================================================================

create policy "public_read_product_images" on storage.objects
  for select using (bucket_id = 'product-images');
create policy "sellers_write_product_images" on storage.objects
  for insert with check (bucket_id = 'product-images' and auth.role() = 'authenticated');
create policy "sellers_manage_own_product_images" on storage.objects
  for update using (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "sellers_delete_own_product_images" on storage.objects
  for delete using (bucket_id = 'product-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "public_read_store_and_banner_images" on storage.objects
  for select using (bucket_id in ('store-images','banners'));
create policy "owners_write_store_images" on storage.objects
  for insert with check (bucket_id = 'store-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "owner_read_write_profile_images" on storage.objects
  for all using (bucket_id = 'profile-images' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "owner_or_admin_documents" on storage.objects
  for all using (
    bucket_id = 'documents'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin())
  );

-- =============================================================================
-- FIN DU SCRIPT
-- -----------------------------------------------------------------------------
-- À prévoir séparément (hors SQL, via Supabase Edge Functions + pg_cron) :
--  - rappels d'expiration d'abonnement (J-7 / J-3 / J-1 / jour J) → notifications
--  - passage automatique des subscriptions/advertisements "active" à "expired"
--  - envoi d'e-mails transactionnels (confirmation commande, paiement, etc.)
-- =============================================================================
