# 🎮 Host4U - Game Hosting Platform

[![Node.js](https://img.shields.io/badge/Node.js-v18+-green.svg)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-v18.3+-blue.svg)](https://reactjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-v5.5+-blue.svg)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-v5.4+-purple.svg)](https://vitejs.dev)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

Host4U is a modern game hosting platform that allows developers to easily upload and share their HTML5 games. With seamless GitHub Pages integration and a user-friendly interface, it's never been easier to showcase your games to the world! 🚀

## ✨ Features

- 🎯 One-click game deployment
- 🔒 Secure authentication with Supabase
- 📱 Responsive design for all devices
- 🎨 Modern UI with Tailwind CSS
- 📦 Support for ZIP file uploads
- 🔄 Automatic GitHub Pages deployment
- 📊 Game management dashboard

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/pinkeshdpatel/host4u.git
   cd host4u
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Create .env file with the following variables
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_key
   GITHUB_TOKEN=your_github_token
   GITHUB_USERNAME=your_github_username
   VITE_NETLIFY_TOKEN=your_netlify_token
   ```

4. **Start development server**
   ```bash
   npm run start
   ```

## 🏗️ Architecture

- **Frontend**: React + TypeScript + Vite
- **Backend**: Node.js + Express
- **Authentication**: Supabase
- **Deployment**: GitHub Pages
- **Styling**: Tailwind CSS
- **File Handling**: Multer + JSZip

## 📝 API Endpoints

- `POST /api/upload` - Upload game files
- `GET /api/games` - Get user's games
- `GET /api/health` - Health check endpoint

## 🔐 Security Features

- JWT-based authentication
- Secure file upload validation
- Rate limiting
- CORS protection
- Environment variable protection

## 🎮 Supported Game Formats

- Single HTML file games
- ZIP archives containing HTML5 games
- Games with multiple assets (images, audio, etc.)
- Maximum file size: 100MB

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [Supabase](https://supabase.io/) for authentication
- [Tailwind CSS](https://tailwindcss.com/) for styling
- [Vite](https://vitejs.dev/) for blazing fast development
- [GitHub Pages](https://pages.github.com/) for hosting

---
Made with ❤️ by [Pinkesh Patel](https://github.com/pinkeshdpatel) 