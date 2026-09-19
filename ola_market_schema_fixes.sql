-- =============================================================================
-- O'LA MARKET — CORRECTIFS RLS
-- -----------------------------------------------------------------------------
-- À exécuter après ola_market_schema.sql. Corrige 3 trous repérés en
-- construisant l'espace vendeur :
--   1. Le vendeur ne pouvait pas voir le nom du client dans /seller/orders.
--   2. Le vendeur ne pouvait pas créer de notification pour son client.
--   3. Un produit devenu inactif disparaissait de l'historique de commande
--      du client qui l'avait acheté (et du vendeur qui l'avait vendu).
-- =============================================================================

-- 1. PROFILES — un vendeur peut voir le profil d'un client avec qui il a
--    au moins une commande en cours.
create policy "profiles_select_by_seller_with_order" on public.profiles
  for select using (
    exists (
      select 1 from public.orders o
      where o.client_id = profiles.id and o.seller_id = auth.uid()
    )
  );

-- 2. NOTIFICATIONS — un vendeur peut notifier un client avec qui il a une
--    commande (ex: "commande confirmée", "commande expédiée").
create policy "notifications_insert_seller_for_client" on public.notifications
  for insert with check (
    exists (
      select 1 from public.orders o
      where o.client_id = notifications.user_id and o.seller_id = auth.uid()
    )
  );

-- 3. PRODUCTS — un produit reste visible pour quiconque a une ligne de
--    commande (client ou vendeur) qui le référence, même s'il est devenu
--    inactif/suspendu entre-temps.
create policy "products_select_via_own_orders" on public.products
  for select using (
    exists (
      select 1 from public.order_items oi
      join public.orders o on o.id = oi.order_id
      where oi.product_id = products.id
        and (o.client_id = auth.uid() or o.seller_id = auth.uid())
    )
  );
