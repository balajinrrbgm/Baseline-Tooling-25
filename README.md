# Baseline Modernizer

A VS Code extension that helps web developers adopt modern web features by integrating with Baseline data. This tool analyzes your web code and provides suggestions for modernization based on the latest web standards and browser compatibility data.

## Features

- 🔍 Analyzes JavaScript, TypeScript, HTML, and CSS files for legacy patterns
- 💡 Suggests modern alternatives based on Baseline data
- 📊 Provides browser compatibility information
- 🛠️ Offers quick-fix actions for automatic modernization
- 📚 Generates documentation with examples for suggested features
- 📈 Tracks adoption metrics of modern web features

## Requirements

- Visual Studio Code 1.60.0 or newer
- Node.js 14.x or newer

## Getting Started

1. Clone this repository
2. Run `npm install` to install dependencies
3. Press F5 to start debugging

## Commands

- `Baseline Modernizer: Analyze Workspace` - Analyzes your current workspace for modernization opportunities

## Development

This extension is built with TypeScript and uses the VS Code Extension API. It integrates with Baseline data to provide accurate and up-to-date information about modern web features and browser compatibility.

### Project Structure

- `src/extension.ts` - Extension entry point
- `src/baselineData.ts` - Baseline data integration
- `src/codeAnalyzer.ts` - Code analysis engine
- `src/modernizationSuggester.ts` - Modernization suggestion system

### Building

1. `npm run compile` - Compile the extension
2. `npm run watch` - Compile and watch for changes
3. `npm run lint` - Lint the code

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT

## Acknowledgments

This project is built for the Baseline Tooling Hackathon and uses data from the Baseline project.