# Auto-Prompt-Creator-Agent

<div align="center">
  <img src="./Images/light_mode.png" alt="Auto-Prompt-Creator-Agent Interface" width="800">
  
  [![GitHub Stars](https://img.shields.io/github/stars/amitroy2930/Auto-Prompt-Creator-Agent?style=for-the-badge)](https://github.com/amitroy2930/Auto-Prompt-Creator-Agent/stargazers)
  [![GitHub Forks](https://img.shields.io/github/forks/amitroy2930/Auto-Prompt-Creator-Agent?style=for-the-badge)](https://github.com/amitroy2930/Auto-Prompt-Creator-Agent/network/members)
  [![License](https://img.shields.io/github/license/amitroy2930/Auto-Prompt-Creator-Agent?style=for-the-badge)](https://github.com/amitroy2930/Auto-Prompt-Creator-Agent/blob/main/LICENSE)
</div>

## 🚀 Overview

**Auto-Prompt-Creator-Agent** is an intelligent multi-agent system designed to streamline prompt engineering and AI interactions. This powerful tool combines multiple specialized agent modes to provide a comprehensive solution for creating, optimizing, and managing AI prompts across various use cases.

### ✨ Key Features

- **🤖 Multiple Agent Modes**: Three distinct operational modes for different use cases
- **🎯 Intelligent Prompt Generation**: Automated creation of task-specific prompts
- **🔧 Adaptive Interface**: Seamless switching between different agent functionalities
- **💡 Smart Recommendations**: AI-powered agent suggestions based on user requirements
- **🌓 Modern UI**: Clean, responsive interface with light/dark mode support

## 🏗️ Architecture

The system is built around three core agent modes, each serving specific purposes:

### 1. **Normal Chat Mode** 💬
- Standard conversational interface for general AI interactions
- Natural language processing for everyday queries
- Context-aware responses and continuous conversation flow
- Perfect for brainstorming, general assistance, and casual interactions

### 2. **Prompting Agent Mode** ⚡
- Specialized mode for generating task-specific prompts
- Advanced prompt engineering capabilities
- Template-based prompt creation with customization options
- Optimization suggestions for improved AI performance
- Export functionality for generated prompts

### 3. **Agent Assistant Mode** 🎯
- Interactive mode with guided question-and-answer sessions
- Intelligent agent recommendation system
- Dynamic prompt creation based on user responses
- Personalized suggestions for optimal agent selection
- Step-by-step workflow guidance

## 🎥 Demo

<div align="center">
  <video src="./Images/dark_mode_2.gif" width="600" controls>
    <p>Your browser does not support the gif tag. <a href="./Images/dark_mode_video.mov">Download the demo video</a></p>
  </video>
  <p><em>Dark mode interface demonstration</em></p>
</div>

## 🛠️ Installation

### Prerequisites
- Python 3.8 or higher
- Node.js 16+ (if using web interface)
- Required API keys for AI services

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/amitroy2930/Auto-Prompt-Creator-Agent.git
   cd Auto-Prompt-Creator-Agent
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and configuration
   ```

4. **Run the application**
   ```bash
   Backend: python web_main.py
   Fronend: npm run dev
   ```

## 📋 Usage

### Getting Started

1. **Launch the application** and select your preferred mode
2. **Normal Chat**: Start typing for standard AI conversations(Type: Start)
3. **Prompting Agent**: Define your task requirements and generate optimized prompts (Type: Prompt Assistant)
4. **Agent Assistant**: Answer guided questions to receive personalized recommendations (Type: Agent Assistant)

### Example Workflows

#### Creating a Marketing Prompt
```
Mode: Prompting Agent
Task: "Create a social media marketing campaign for a tech startup"
Output: Optimized prompt with targeting, tone, and content guidelines
```

#### Getting Agent Recommendations
```
Mode: Agent Assistant
Human: "Want to convert text to sql besd on schema description"
AI: "Ask Question"
Human: "Answers The Question"
Result: Recommended agents and custom prompt generation
```

## 🔧 Configuration

### Environment Variables
```bash
# API Configuration
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key

# Application Settings
DEBUG=False
MAX_TOKENS=2000
TEMPERATURE=0.7
```

### Customization Options
- **Agent Personalities**: Modify agent behaviors in `app/backend/prompts`
- **UI Themes**: Customize appearance in `arc/App.css/`

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

<!-- ### Development Guidelines
- Follow PEP 8 style guidelines
- Add tests for new features
- Update documentation as needed
- Ensure backward compatibility -->

<!-- ## 📊 Roadmap

- [ ] **Multi-language Support**: Expand to support multiple languages
- [ ] **Advanced Analytics**: Usage statistics and performance metrics
- [ ] **Plugin System**: Extensible architecture for custom agents
- [ ] **Cloud Integration**: Deploy and scale in cloud environments
- [ ] **Mobile App**: Native mobile application development

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. -->

## 🙏 Acknowledgments

- Thanks to the open-source AI community for inspiration and tools
<!-- - Special recognition to contributors and beta testers
- Built with modern web technologies and AI frameworks -->

<!-- ## 📞 Support

- **Documentation**: [Wiki](https://github.com/amitroy2930/Auto-Prompt-Creator-Agent/wiki)
- **Issues**: [GitHub Issues](https://github.com/amitroy2930/Auto-Prompt-Creator-Agent/issues)
- **Discussions**: [GitHub Discussions](https://github.com/amitroy2930/Auto-Prompt-Creator-Agent/discussions) -->

---

<div align="center">
  <p>Made with ❤️ by <a href="https://github.com/amitroy2930">Amit Roy</a></p>
  <p>⭐ Star this repo if you find it helpful!</p>
</div>
