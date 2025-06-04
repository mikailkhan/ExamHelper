# ExamHelper

ExamHelper is a tool designed to assist students and educators in managing, generating, and reviewing exam materials efficiently.

## Features

- Create and organize exam questions
- Generate randomized quizzes
- Track student progress and results

## Prerequisites:

This is a Node.js application.

- Ensure that Node.js is installed on your system before running this application.

## Installation

Clone the repository:

```bash
git clone https://github.com/mikailkhan/ExamHelper.git
cd ExamHelper
```

Install dependencies:

```bash
# Example for Node.js projects
npm install
```

### OpenAI API Key Required

ExamHelper requires access to the OpenAI API.  
You must obtain an OpenAI API key from [https://platform.openai.com/account/api-keys](https://platform.openai.com/account/api-keys).

After obtaining your API key, create a `.env` file in the project root and add:

```env
API_KEY=your_openai_api_key_here
```

## Usage

Start the application:

```bash
node index.js
```

Follow the on-screen instructions to begin creating or managing exams.

## Contributing

Contributions are welcome! Please open issues or submit pull requests for improvements.

## License

This project is licensed under the MIT License.
