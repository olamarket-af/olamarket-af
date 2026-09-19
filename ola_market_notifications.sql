-- =============================================================================
-- O'LA MARKET — NOTIFICATIONS AUTOMATIQUES
-- -----------------------------------------------------------------------------
-- À exécuter après ola_market_schema.sql (et ses correctifs RLS). Deux
-- mécanismes :
--  1. Triggers événementiels (immédiats) : nouvelle commande, changement de
--     statut, nouvel avis, nouveau message, paiement confirmé.
--  2. Une fonction planifiée (pg_cron, une fois par jour) : rappels
--     d'expiration d'abonnement (J-7/J-3/J-1/jour J) + passage automatique
--     des abonnements/publicités expirés en statut "expired".
-- Toutes les fonctions sont "security definer" : elles s'exécutent avec les
-- droits du propriétaire (postgres), donc elles contournent les RLS — c'est
-- volontaire et sans risque puisque le code est fixe et ne fait qu'insérer
-- des notifications ou mettre à jour des statuts d'expiration.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. NOUVELLE COMMANDE → notifie le vendeur
-- -----------------------------------------------------------------------------

create or replace function public.notify_new_order()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, title, message, metadata)
  values (
    new.seller_id,
    'new_order',
    'Nouvelle commande',
    'Vous avez reçu la commande ' || new.order_number || '.',
    jsonb_build_object('order_id', new.id)
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_new_order on public.orders;
create trigger trg_notify_new_order
  after insert on public.orders
  for each row execute function public.notify_new_order();

-- -----------------------------------------------------------------------------
-- 2. CHANGEMENT DE STATUT DE COMMANDE → notifie le client
-- -----------------------------------------------------------------------------

create or replace function public.notify_order_status_change()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_title text;
  v_message text;
  v_type text;
begin
  if new.status = old.status then
    return new;
  end if;

  v_type := 'order_' || new.status;

  v_title := case new.status
    when 'confirmed' then 'Commande confirmée'
    when 'preparing' then 'Commande en préparation'
    when 'shipping' then 'Commande expédiée'
    when 'delivered' then 'Commande livrée'
    when 'completed' then 'Commande terminée'
    when 'cancelled' then 'Commande annulée'
    else 'Mise à jour de commande'
  end;

  v_message := 'Votre commande ' || new.order_number || ' est maintenant : ' || v_title || '.';

  insert into public.notifications (user_id, type, title, message, metadata)
  values (new.client_id, v_type, v_title, v_message, jsonb_build_object('order_id', new.id));

  return new;
end;
$$;

drop trigger if exists trg_notify_order_status_change on public.orders;
create trigger trg_notify_order_status_change
  after update on public.orders
  for each row execute function public.notify_order_status_change();

-- -----------------------------------------------------------------------------
-- 3. NOUVEL AVIS → notifie le vendeur du produit
-- -----------------------------------------------------------------------------

create or replace function public.notify_new_review()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_seller_id uuid;
  v_product_name text;
begin
  select seller_id, name into v_seller_id, v_product_name
  from public.products where id = new.product_id;

  insert into public.notifications (user_id, type, title, message, metadata)
  values (
    v_seller_id,
    'new_review',
    'Nouvel avis',
    'Un client a laissé ' || new.rating || '★ sur "' || v_product_name || '".',
    jsonb_build_object('product_id', new.product_id, 'review_id', new.id)
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_new_review on public.reviews;
create trigger trg_notify_new_review
  after insert on public.reviews
  for each row execute function public.notify_new_review();

-- -----------------------------------------------------------------------------
-- 4. NOUVEAU MESSAGE → notifie l'autre participant de la conversation
-- -----------------------------------------------------------------------------

create or replace function public.notify_new_message()
returns trigger
language plpgsql
security definer set search_path = public
as $$
declare
  v_recipient uuid;
begin
  select case when new.sender_id = c.client_id then c.seller_id else c.client_id end
  into v_recipient
  from public.conversations c where c.id = new.conversation_id;

  insert into public.notifications (user_id, type, title, message, metadata)
  values (
    v_recipient,
    'new_message',
    'Nouveau message',
    left(new.content, 120),
    jsonb_build_object('conversation_id', new.conversation_id)
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_new_message on public.messages;
create trigger trg_notify_new_message
  after insert on public.messages
  for each row execute function public.notify_new_message();

-- -----------------------------------------------------------------------------
-- 5. PAIEMENT CONFIRMÉ → notifie l'utilisateur + active l'abonnement/la pub
-- -----------------------------------------------------------------------------

create or replace function public.notify_payment_completed()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if new.status <> 'completed' or old.status = 'completed' then
    return new;
  end if;

  insert into public.notifications (user_id, type, title, message, metadata)
  values (
    new.user_id,
    'payment_confirmed',
    'Paiement confirmé',
    'Votre paiement de ' || new.amount || ' ' || new.currency || ' a été confirmé.',
    jsonb_build_object('payment_id', new.id, 'purpose', new.purpose)
  );

  if new.purpose = 'subscription' then
    -- Le décompte des 30 jours démarre à l'activation réelle (paiement
    -- confirmé), pas au moment où l'abonnement "pending" a été créé.
    update public.subscriptions
      set status = 'active',
          start_date = now(),
          end_date = now() + interval '30 days'
      where id = new.reference_id;
  elsif new.purpose = 'advertising' then
    update public.advertisements
      set status = 'active',
          start_date = coalesce(start_date, now()),
          end_date = coalesce(end_date, now() + (
            select (duration_days || ' days')::interval
            from public.advertising_plans where id = advertising_plan_id
          ))
      where id = new.reference_id;

    insert into public.notifications (user_id, type, title, message, metadata)
    values (new.user_id, 'ad_activated', 'Publicité activée', 'Votre publicité est maintenant active.',
      jsonb_build_object('advertisement_id', new.reference_id));
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notify_payment_completed on public.payments;
create trigger trg_notify_payment_completed
  after update on public.payments
  for each row execute function public.notify_payment_completed();

-- -----------------------------------------------------------------------------
-- 6. TÂCHE QUOTIDIENNE — rappels d'expiration + expiration automatique
-- -----------------------------------------------------------------------------

create or replace function public.run_daily_notifications()
returns void
language plpgsql
security definer set search_path = public
as $$
declare
  sub record;
  ad record;
  days_left int;
  v_type text;
  v_title text;
begin
  -- Rappels J-7 / J-3 / J-1 / jour J pour les abonnements actifs
  for sub in
    select s.id, s.seller_id, s.end_date, p.name as plan_name
    from public.subscriptions s
    join public.subscription_plans p on p.id = s.plan_id
    where s.status = 'active' and s.end_date > now()
  loop
    days_left := ceil(extract(epoch from (sub.end_date - now())) / 86400);

    if days_left in (7, 3, 1, 0) then
      v_type := 'subscription_expiring_' || days_left || 'd';
      v_title := 'Abonnement bientôt expiré';

      -- Évite les doublons si la tâche tourne plusieurs fois le même jour.
      if not exists (
        select 1 from public.notifications
        where user_id = sub.seller_id
          and type = v_type
          and metadata->>'subscription_id' = sub.id::text
          and created_at::date = current_date
      ) then
        insert into public.notifications (user_id, type, title, message, metadata)
        values (
          sub.seller_id, v_type, v_title,
          case days_left
            when 0 then 'Votre abonnement ' || sub.plan_name || ' expire aujourd''hui.'
            else 'Votre abonnement ' || sub.plan_name || ' expire dans ' || days_left || ' jour(s).'
          end,
          jsonb_build_object('subscription_id', sub.id)
        );
      end if;
    end if;
  end loop;

  -- Passage en "expired" des abonnements arrivés à échéance
  update public.subscriptions
    set status = 'expired'
    where status = 'active' and end_date <= now();

  insert into public.notifications (user_id, type, title, message, metadata)
  select seller_id, 'subscription_expired', 'Abonnement expiré',
         'Votre abonnement a expiré. Renouvelez-le pour continuer à publier de nouveaux produits.',
         jsonb_build_object('subscription_id', id)
  from public.subscriptions
  where status = 'expired' and end_date <= now() and end_date > now() - interval '1 day';

  -- Passage en "expired" des publicités arrivées à échéance
  update public.advertisements
    set status = 'expired'
    where status = 'active' and end_date is not null and end_date <= now();
end;
$$;

-- Planification quotidienne (nécessite l'extension pg_cron, activable dans
-- Supabase → Database → Extensions). Si pg_cron n'est pas disponible sur
-- votre offre, appeler cette fonction via une Edge Function + un
-- déclencheur externe (ex: cron-job.org) à la place.
create extension if not exists pg_cron;

select cron.schedule(
  'ola-market-daily-notifications',
  '0 7 * * *', -- tous les jours à 07h00 UTC
  $$ select public.run_daily_notifications(); $$
);

-- -----------------------------------------------------------------------------
-- 7. TEMPS RÉEL — nécessaire pour que la messagerie (/account/messages,
--    /seller/messages) reçoive les nouveaux messages instantanément sans
--    recharger la page.
-- -----------------------------------------------------------------------------

alter publication supabase_realtime add table public.messages;

