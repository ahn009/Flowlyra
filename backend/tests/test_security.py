def test_password_hashing():
    from app.middleware.auth import hash_password, verify_password

    password_hash = hash_password("Dev@12345")
    assert verify_password("Dev@12345", password_hash)
