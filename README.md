# 🔐 Secure Login & User Management System

![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Express.js](https://img.shields.io/badge/Express.js-404D59?style=for-the-badge)
![MongoDB](https://img.shields.io/badge/MongoDB-4EA94B?style=for-the-badge&logo=mongodb&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)
![Jest](https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white)

โปรเจกต์ระบบการยืนยันตัวตน (Authentication) และการจัดการผู้ใช้งานแบบครบวงจร พัฒนาด้วย **Node.js, Express, MongoDB** สำหรับฝั่ง Backend และ **HTML/CSS/Vanilla JS** สำหรับฝั่ง Frontend รองรับระบบรักษาความปลอดภัยด้วย JWT และ Role-based Access Control (Admin/User)

---

## 📑 สารบัญ
- [✨ ฟีเจอร์หลัก (Features)](#-ฟีเจอร์หลัก-features)
- [📁 โครงสร้างโปรเจกต์ (Project Structure)](#-โครงสร้างโปรเจกต์-project-structure)
- [🚀 การติดตั้งและใช้งาน (Installation & Setup)](#-การติดตั้งและใช้งาน-installation--setup)
- [⚙️ ตัวแปรสภาพแวดล้อม (Environment Variables)](#-ตัวแปรสภาพแวดล้อม-environment-variables)
- [📡 API Endpoints](#-api-endpoints)
- [🧪 การทดสอบระบบ (Testing)](#-การทดสอบระบบ-testing)

---

## ✨ ฟีเจอร์หลัก (Features)

### 👤 ฝั่งผู้ใช้งาน (User / Frontend)
- **ระบบสมาชิก (Authentication):** สมัครสมาชิก (Register), เข้าสู่ระบบ (Login) อย่างปลอดภัยด้วยรหัสผ่านที่ถูกแฮช (Bcrypt)
- **รีเซ็ตรหัสผ่าน (Password Reset):** ระบบลืมรหัสผ่านและส่งลิงก์รีเซ็ตผ่านอีเมล (Nodemailer/Gmail API)
- **จัดการโปรไฟล์ (Profile Settings):** ผู้ใช้สามารถดูและแก้ไขข้อมูลส่วนตัวได้
- **ระบบดาวน์โหลดไฟล์:** จำกัดการเข้าถึงหน้าดาวน์โหลดเฉพาะผู้ที่เข้าสู่ระบบแล้วเท่านั้น
- **ฟอร์มติดต่อ (Contact Form):** ส่งข้อความหรือ Feedback ถึงผู้ดูแลระบบ

### 🛡️ ฝั่งผู้ดูแลระบบ (Admin)
- **Admin Dashboard:** แผงควบคุมสำหรับผู้ดูแลระบบ
- **การจัดการผู้ใช้ (User Management):** ดูรายชื่อผู้ใช้ทั้งหมด, แก้ไขบทบาท (Role), หรือลบผู้ใช้ได้
- **Role-Based Access Control (RBAC):** มีการแยกสิทธิ์ระหว่าง `user` ทั่วไป และ `admin`

---

## 📁 โครงสร้างโปรเจกต์ (Project Structure)

```text
📦 logins
 ┣ 📂 backend                 # โค้ดฝั่งเซิร์ฟเวอร์ (Node.js/Express)
 ┃ ┣ 📂 __tests__             # ไฟล์ทดสอบระบบ (Jest & Supertest)
 ┃ ┣ 📂 config                # ตั้งค่า Database และอื่นๆ
 ┃ ┣ 📂 middleware            # ตัวจัดการก่อนเข้า Route (เช่น ตรวจสอบ JWT)
 ┃ ┣ 📂 models                # โครงสร้างฐานข้อมูล (Mongoose Schema)
 ┃ ┣ 📂 routes                # จุดเชื่อมต่อ API (API Endpoints)
 ┃ ┣ 📂 utils                 # ฟังก์ชันเสริม (เช่น ส่งอีเมล, สร้างโค้ด)
 ┃ ┗ 📜 server.js             # ไฟล์หลักในการรัน Backend
 ┣ 📂 frontend                # โค้ดฝั่งหน้าเว็บ (HTML/CSS/JS)
 ┃ ┣ 📂 css                   # สไตล์ชีท
 ┃ ┣ 📂 js                    # ลอจิกการทำงานฝั่ง Client
 ┃ ┣ 📜 index.html            # หน้า Landing Page
 ┃ ┣ 📜 login.html            # หน้าเข้าสู่ระบบ
 ┃ ┗ 📜 admin.html            # หน้าจัดการของผู้ดูแลระบบ
 ┗ 📜 README.md               # เอกสารคู่มือโปรเจกต์