def test_socket_imports():
    from app.socket_manager import sio

    assert sio.async_mode == "asgi"
