# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

---

## Deploy Frontend lên VPS

### 1. Build bản production ở máy local

```bash
npm run build
```

Kết quả build nằm trong thư mục `dist/`.

### 2. Cấu hình biến môi trường

Trước khi build, đảm bảo file `.env` có đúng API URL production:

```env
VITE_API_BASE_URL=http//103.178.235.163/
```

### 3. SSH vào VPS và dọn thư mục cũ

```bash
ssh root@IP_VPS
```

Chạy:

```bash
rm -rf /var/www/ar-history/frontend/*
mkdir -p /var/www/ar-history/frontend
exit
```

### 4. Upload bản build mới lên VPS

Ở máy local, trong thư mục frontend, chạy:

```bash
scp -r dist/* root@IP_VPS:/var/www/ar-history/frontend/
```

Ví dụ:

```bash
scp -r dist/* root@123.45.67.89:/var/www/ar-history/frontend/
```

### 5. Reload Nginx

SSH lại vào VPS:

```bash
ssh root@IP_VPS
```

Chạy:

```bash
nginx -t
systemctl reload nginx
```

> **Lưu ý:** `nginx -t` kiểm tra cấu hình Nginx hợp lệ trước khi reload. Nếu có lỗi, sửa config trước khi chạy `systemctl reload nginx`.
