-- ============================================================================
-- MATRIMONIAL APP - SEED 100 DUMMY USERS
-- ============================================================================
-- Run this script in your Supabase SQL Editor to generate 100 random users
-- with complete profiles. All users will have the password: "password123"

DO $$
DECLARE
  new_user_id uuid;
  male_names text[] := ARRAY['Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Rahul', 'Rohan', 'Vikram', 'Karan', 'Siddharth', 'Amit', 'Nikhil', 'Dev'];
  female_names text[] := ARRAY['Riya', 'Aanya', 'Diya', 'Ananya', 'Saanvi', 'Priya', 'Neha', 'Kavya', 'Pooja', 'Sneha', 'Shruti', 'Meera', 'Tara', 'Aditi'];
  last_names text[] := ARRAY['Sharma', 'Patel', 'Singh', 'Kumar', 'Reddy', 'Gupta', 'Verma', 'Jain', 'Rao', 'Iyer', 'Desai', 'Joshi', 'Chauhan', 'Shah'];
  cities text[] := ARRAY['Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata', 'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow'];
  professions text[] := ARRAY['Software Engineer', 'Doctor', 'Teacher', 'Business Analyst', 'Architect', 'Lawyer', 'Entrepreneur', 'Designer', 'Manager', 'Accountant'];
  religions text[] := ARRAY['Hindu', 'Muslim', 'Christian', 'Sikh', 'Jain', 'Buddhist', 'Other'];
  educations text[] := ARRAY['B.Tech', 'M.Tech', 'MBBS', 'MBA', 'B.Sc', 'M.Sc', 'PhD', 'B.Com', 'M.Com', 'B.A.'];
  genders text[] := ARRAY['male', 'female'];
  selected_gender text;
  random_name text;
  random_email text;
BEGIN
  -- Generate 100 users
  FOR i IN 1..100 LOOP
    new_user_id := gen_random_uuid();
    selected_gender := genders[floor(random() * 2 + 1)];
    
    IF selected_gender = 'male' THEN
      random_name := male_names[floor(random() * array_length(male_names, 1) + 1)] || ' ' || last_names[floor(random() * array_length(last_names, 1) + 1)];
    ELSE
      random_name := female_names[floor(random() * array_length(female_names, 1) + 1)] || ' ' || last_names[floor(random() * array_length(last_names, 1) + 1)];
    END IF;

    random_email := 'dummy_user_' || i || '_' || floor(random() * 100000) || '@example.com';
    
    -- Insert into Supabase Auth table (auth.users)
    -- Using basic fields required by Supabase Auth
    INSERT INTO auth.users (
      id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, 
      created_at, updated_at, confirmation_token, recovery_token, email_change_token_new, email_change
    )
    VALUES (
      new_user_id,
      '00000000-0000-0000-0000-000000000000',
      'authenticated',
      'authenticated',
      random_email,
      crypt('password123', gen_salt('bf')), -- All users will have password: password123
      NOW(),
      NOW() - (random() * interval '60 days'),
      NOW(),
      '', '', '', ''
    );
    
    -- Insert into public profiles table
    INSERT INTO public.profiles (
      id, name, age, gender, religion, city, education, profession, bio, role, is_blocked, created_at
    )
    VALUES (
      new_user_id,
      random_name,
      floor(random() * (35 - 22 + 1) + 22)::int, -- Random age between 22 and 35
      selected_gender,
      religions[floor(random() * array_length(religions, 1) + 1)],
      cities[floor(random() * array_length(cities, 1) + 1)],
      educations[floor(random() * array_length(educations, 1) + 1)],
      professions[floor(random() * array_length(professions, 1) + 1)],
      'Hello! I am ' || random_name || '. I am looking for a meaningful connection and someone to share life with. I enjoy travelling, reading, and spending time with family.',
      'user',
      false,
      NOW() - (random() * interval '60 days')
    );
  END LOOP;
END $$;
