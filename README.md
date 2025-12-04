# 🔐 JWT Security Checker

> A comprehensive web-based platform for JSON Web Token security testing and analysis

**Built by [Al-Amir Badmus](https://github.com/Commando-X) for [Exploit-forge LTD](https://exploit-forge.com)**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue.svg)](https://www.docker.com/)
[![GitHub Actions](https://img.shields.io/badge/CI%2FCD-GitHub%20Actions-green.svg)](https://github.com/features/actions)

JWT Security Checker is a professional-grade security testing platform designed for penetration testers, security researchers, and developers to analyze and test JSON Web Token implementations. Built with modern web technologies and powered by industry-standard tools.

## ✨ Features

### 🔍 **JWT Analysis & Manipulation**
- **Real-time JWT Decoder/Encoder** - Decode, edit, and encode JWTs with live preview
- **Client-side Processing** - All decoding/encoding happens in the browser; tokens stay on your device
- **Signature Verification** - Verify token signatures with custom secrets
- **Algorithm Support** - Full symmetric (HS256/384/512) and asymmetric (RS256/384/512, ES256/384/512) support, plus none
- **Claims Editor** - Interactive JSON and table view for easy claims modification

### ⚡ **Security Testing Tools**
- **JWT Secret Cracking** - Brute-force weak secrets using dictionary attacks
- **100,000+ Default Wordlist** - Comprehensive built-in wordlist for common secrets
- **Custom Wordlist Support** - Upload your own wordlists (up to 2MB)
- **Real-time Progress** - Live attack logs and progress monitoring
- **Algorithm Confusion Testing** - Test for algorithm switching vulnerabilities

### 🛠 **Pentesting Tool Collection**
- **JWTTool Integration** - Powered by the renowned jwt_tool by @ticarpi
- **Burp Suite Extensions** - JWT Editor, Hackvertor, JWT4B integration guides
- **Hashcat Support** - GPU-accelerated cracking capabilities
- **Multiple Cracking Tools** - Comprehensive toolkit for various attack vectors

### 🎨 **Modern User Interface**
- **JWT.io-inspired Design** - Familiar interface for security professionals
- **Dark/Light Theme** - Comfortable viewing in any environment
- **Responsive Design** - Works seamlessly on desktop, tablet, and mobile
- **Real-time Updates** - Live feedback during security testing operations

### 🛡️ **JWT Scanner**
- **Automated JWT Vulnerability Scanner** - Scan tokens for common vulnerabilities (none algorithm, weak secrets, insecure claims, etc.)
- **Detailed Security Reports** - Get actionable insights and recommendations
- **One-Click Scan** - Instantly analyze any JWT for security issues

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Git

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/exploit-forge/xjwt.git
   cd xjwt
   ```

2. **Start with Docker Compose**
   ```bash
   docker-compose up -d
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000

That's it! The application will be running with all services configured.

## 📖 Usage Guide

### Basic JWT Operations

1. **Decode a JWT**
   - Paste your JWT token in the input field
   - View decoded header and payload in real-time
   - Switch between JSON and table view

2. **Verify Signature**
   - Enter the secret key used to sign the JWT
   - Select the appropriate algorithm
   - Click "Verify Signature" to check validity

3. **Generate New Token**
   - Edit header and payload as needed
   - Provide a secret key
   - Click "Generate Token" to create a new JWT

### Security Testing

1. **Crack JWT Secrets**
   - Navigate to "JWT Security Testing"
   - Paste the target JWT token
   - Optional: Upload custom wordlist
   - Click "Start Attack" and monitor progress

2. **Scan JWT for Vulnerabilities**
   - Go to the "JWT Scanner" section
   - Paste or upload your JWT token
   - Click "Scan Token"
   - Review the detailed security report and recommendations


## 🛡️ Security Features

### Privacy Protection
- ✅ No permanent data storage
- ✅ Automatic cleanup of temporary files
- ✅ Server-side processing with immediate deletion
- ✅ No long-term retention of sensitive information
- ✅ Decode/encode operations run entirely in the frontend, keeping tokens local to your browser

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **[jwt_tool](https://github.com/ticarpi/jwt_tool)** by @ticarpi - The powerful JWT testing toolkit that powers our cracking capabilities
- **[JWT.io](https://jwt.io)** - Inspiration for the user interface design
- **Security Community** - For continuous feedback and improvement suggestions

## 🔗 Links

- **🌐 Live Demo**: [https://xjwt.io](https://xjwt.io)
- **📚 Documentation**: [https://docs.exploit-forge.com](https://docs.exploit-forge.com)
- **🐛 Bug Reports**: [GitHub Issues](https://github.com/exploit-forge/xjwt/issues)
- **💬 Discussions**: [GitHub Discussions](https://github.com/exploit-forge/xjwt/discussions)

## 📞 Support

- **Website**: [https://exploit-forge.com](https://exploit-forge.com)
- **Email**: security@exploit-forge.com
- **Twitter**: [@ExploitforgeLTD](https://twitter.com/exploitforgeltd)
- **LinkedIn**: [Exploit-forge LTD](https://linkedin.com/company/exploit-forge)

---

<div align="center">
  <sub>Built with ❤️ by <a href="https://exploit-forge.com">Exploit-forge LTD</a></sub>
</div>
