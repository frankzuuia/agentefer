begin;

create index price_books_created_by_user_idx
  on app_private.price_books (created_by_user_id)
  where created_by_user_id is not null;

comment on index app_private.price_books_created_by_user_idx is
  'Supports auth.users foreign-key maintenance without scanning every price book';

commit;
