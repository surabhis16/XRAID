-- 1. See the stored bcrypt hash
SELECT email, password_hash FROM users WHERE email = 'admin@xraid.io';

-- 2. Breakdown of the hash
SELECT 
    email,
    split_part(password_hash, '$', 2) AS algorithm,
    split_part(password_hash, '$', 3) AS cost_factor,
    substring(split_part(password_hash, '$', 4), 1, 22) AS salt,
    substring(split_part(password_hash, '$', 4), 23) AS hash,
    length(password_hash) AS total_length
FROM users WHERE email = 'admin@xraid.io';

-- 3. See all users and their roles
SELECT user_id, email, full_name, role, is_active, created_at, last_login 
FROM users;

-- 4. Prove no plaintext passwords exist anywhere
SELECT email, 
    CASE 
        WHEN password_hash LIKE '$2b$%' THEN 'bcrypt hashed'
        WHEN password_hash LIKE '$2a$%' THEN 'bcrypt hashed'
        ELSE 'NOT HASHED - DANGER'
    END AS hash_status
FROM users;

-- 5. Show role constraint definition
SELECT conname, consrc 
FROM pg_constraint 
WHERE conrelid = 'users'::regclass;

-- 6. Show last login (proves JWT auth is working - updates on each login)
SELECT email, last_login 
FROM users 
WHERE email = 'admin@xraid.io';