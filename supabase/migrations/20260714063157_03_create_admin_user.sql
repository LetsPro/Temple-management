
/*
# Create Admin User

Creates a confirmed admin account via Supabase auth internals.

- Email: admin@temple.com
- Password: Temple@Admin123
- Role: admin (set in profiles table)
*/

DO $$
DECLARE
  v_user_id uuid;
BEGIN
  -- Check if user already exists
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'admin@temple.com';

  IF v_user_id IS NULL THEN
    v_user_id := gen_random_uuid();

    INSERT INTO auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      role,
      aud,
      created_at,
      updated_at,
      raw_app_meta_data,
      raw_user_meta_data,
      is_super_admin,
      confirmation_token,
      recovery_token
    ) VALUES (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      'admin@temple.com',
      crypt('Temple@Admin123', gen_salt('bf')),
      now(),
      'authenticated',
      'authenticated',
      now(),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Temple Administrator"}',
      false,
      '',
      ''
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      gen_random_uuid(),
      v_user_id,
      'admin@temple.com',
      jsonb_build_object('sub', v_user_id::text, 'email', 'admin@temple.com'),
      'email',
      now(),
      now(),
      now()
    );
  END IF;

  -- Upsert profile with admin role
  INSERT INTO profiles (id, full_name, role, is_active)
  VALUES (v_user_id, 'Temple Administrator', 'admin', true)
  ON CONFLICT (id) DO UPDATE SET role = 'admin', full_name = 'Temple Administrator', is_active = true;
END $$;
