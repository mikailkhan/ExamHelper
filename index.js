// Imports
import express from 'express';
import bodyParser from 'body-parser';
import OpenAI from "openai";
import dotenv from "dotenv"
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";


// System Settings
const PORT = 3000;
const app = express();

dotenv.config();

app.use(bodyParser.urlencoded());
app.use(express.static("public"));

// Open AI connection
const client = new OpenAI({
    apiKey: process.env['API_KEY'], // This is the default and can be omitted
});

// Exam Variables
let totalQuestions = 0;
let examCompleted = false;
let structuredQuestions;


// Setting Structure for Questions based on exam type
const MCQExamStructure = z.object ({
    question: z.string(),
    a: z.string(),
    b: z.string(),
    c: z.string(),
    d: z.string(),
    answer: z.string(),
    explaination: z.string()
});

const MCQList = z.object({
    mcqs:  z.array(MCQExamStructure)
});

const ReviewExamStructure = z.object ({
    question: z.string(),
    marks: z.string(),
    markingScheme: z.string()
});

const ReviewQuestionList = z.object({
    exam: z.array(ReviewExamStructure)
});


// Handling Requests 


// Home Page
app.get("/", (req, res)=>{
    res.render("index.ejs");
});


// When user submits request on home page for exam
app.post("/start", async (req, res) => {
    
    const subject = req.body.subject;
    const topic = req.body.topic;
    const content = req.body.content;
    const type = req.body.type;
    totalQuestions = req.body.totalQuestions;
    let prompt = `{Subject: ${subject}}, \n {Topic: ${topic}}, \n {Topic Content: ${content}}`;
    let instructions = "";
    let structure = "";
    let structureObject = "";

    if (type == "quiz") {
        // quiz 
         instructions = `Generate a MCQ-based quiz with ${totalQuestions} questions from the information in the following format: Question A B C D Answer Explaination`; 
         structure = MCQList;
         structureObject = "mcqObject";
    } else {
        // Review Questions
        instructions = `Generate a review based exam with ${totalQuestions} questions from the information in the following format: Question Marks MarkingScheme`;
        structure = ReviewQuestionList;
        structureObject = "reviewExamObject";
    }

    const response = await client.responses.parse({
    model: 'gpt-4o',
    input: [
       { 
        role: "system",
        content: instructions
    },
    {
        role: "user",
        content: prompt
    }
    ],
    text: {
        format: zodTextFormat(structure, structureObject)
    }
    });

    structuredQuestions = response.output_parsed;

    if (type == "quiz") {
        res.redirect(303, "/quiz");    
    } else {
        res.redirect(302, "/review");
    }
    
});


// Quiz start page
app.get("/quiz",(req, res)=>{
    let quizData = {
        quiz: structuredQuestions
    }
    if (structuredQuestions) {
        res.render("quiz.ejs", quizData);
    } else {
        res.redirect(302, "/");
    }
});


// After quiz is submitted 
app.post("/quizresult", (req, res) => {
    const answerMCQs = req.body;

    let correctMCQS = 0;
    let wrongMCQS = 0;
    let leftMCQS = 0;

    for (const key in answerMCQs) {        
        // Removes the mcq part from the name to return the number of the mcq
        let answeredMCQNumber = parseInt(key.slice(3)) - 1; 
        let chosenMCQ = structuredQuestions.mcqs[answeredMCQNumber];

        if (chosenMCQ.answer.toLowerCase() == answerMCQs[key].toLowerCase()) {
            chosenMCQ.filled = 1;
            chosenMCQ.choosenOption = answerMCQs[key];
            chosenMCQ.result = "correct";
            correctMCQS++;
        } else  {
            chosenMCQ.filled = 1;
            chosenMCQ.choosenOption = answerMCQs[key];
            chosenMCQ.result = "wrong";
            wrongMCQS++;
        }
    }

    leftMCQS = totalQuestions - correctMCQS - wrongMCQS;
    examCompleted = true;

    let quizData = {
        examCompleted:  examCompleted,
        totalQuestions: totalQuestions,
        correctMCQs:  correctMCQS,
        wrongMCQS: wrongMCQS,
        leftMCQS: leftMCQS,
        quiz: structuredQuestions
    }

    console.log(quizData);

    res.render("quiz.ejs", quizData);
});


// Review Exam Page
app.get("/review",(req, res)=>{
    let reviewExamData = {
        review: structuredQuestions
    };
    res.render("review.ejs", reviewExamData);
});

// Result
app.post("/reviewresult", async (req, res) => {
    const userResponse = req.body;

    let totalMarks = 0;
    let totalObtainedMarks = 0;
    
    for (const key in userResponse) {
        structuredQuestions.exam[parseInt(key.slice(6)) - 1].userAnswer = userResponse[key];  
        structuredQuestions.exam[parseInt(key.slice(6)) - 1].userAnswerKey = key;
    }

    let instructions = "Check the user answer against the question and its marking scheme. Provide the userAnswerKey, obtained marks, and feedback";
    let prompt = "";
    
    structuredQuestions.exam.forEach(question => {
        prompt += JSON.stringify(question);
        totalMarks += parseInt(question.marks);  
    });

    // Setting Structure for Questions based on exam type
    const feedbackStructure = z.object ({
        userAnswerKey: z.string(),
        obtainedMarks: z.string(), 
        feedback: z.string(),
    });

    const feedbackList = z.object({
        feedback:  z.array(feedbackStructure)
    });

    const response = await client.responses.parse({
    model: 'gpt-4o',
    input: [
    { 
        role: "system",
        content: instructions
    },
    {
        role: "user",
        content: prompt
    }
    ],
    text: {
        format: zodTextFormat(feedbackList, "feedback")
    }
    });

    let checkedResponse = response.output_parsed;

    // console.log(checkedResponse);


    checkedResponse.feedback.forEach(eachFeedback => {
        totalObtainedMarks += parseFloat(eachFeedback.obtainedMarks);
        let key = parseInt(eachFeedback.userAnswerKey.slice(6)) - 1;
        structuredQuestions.exam[key].obtainedMarks = eachFeedback.obtainedMarks;
        structuredQuestions.exam[key].feedback = eachFeedback.feedback;
    });

    let reviewExamData = {
        examCompleted: true,
        review: structuredQuestions,
        totalObtainedMarks: totalObtainedMarks,
        totalMarks: totalMarks
    };


    res.render("review.ejs", reviewExamData);
});

// Server Start
app.listen(PORT, ()=>{
    console.log(`Server successfully started on port ${PORT}`);
});
