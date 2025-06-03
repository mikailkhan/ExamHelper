import express from 'express';
import bodyParser from 'body-parser';
import OpenAI from "openai";
import dotenv from "dotenv"
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";



const PORT = 3000;
const app = express();


dotenv.config();

const totalQuestions = 0;
let examCompleted = false;

let structuredMCQS;

const client = new OpenAI({
    apiKey: process.env['API_KEY'], // This is the default and can be omitted
});

const MCQ = z.object ({
    question: z.string(),
    a: z.string(),
    b: z.string(),
    c: z.string(),
    d: z.string(),
    answer: z.string(),
    explaination: z.string()
});

const MCQList = z.object({
    mcqs:  z.array(MCQ)
});

app.use(bodyParser.urlencoded());
app.use(express.static("public"));

app.get("/", (req, res)=>{
    res.render("index.ejs");
});

app.post("/start", async (req, res) => {
    
    const subject = req.body.subject;
    const topic = req.body.topic;
    const content = req.body.content;
    const type = req.body.type;
    totalQuestions = req.body.totalQuestions;
    let prompt = `{Subject: ${subject}}, \n {Topic: ${topic}}, \n {Topic Content: ${content}}`;
    let instructions = "";

    if (type == "quiz") {
        // quiz 
         instructions = `Generate a MCQ-based quiz with ${totalQuestions} questions from the information in the following format: Question A B C D Answer Explaination`; 
    } else {
        // Review Questions
        
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
        format: zodTextFormat(MCQList, "mcqObject")
    }
    });

    structuredMCQS = response.output_parsed;

    res.redirect(303, "/quiz");    
});

app.get("/quiz",(req, res)=>{
    let quizData = {
        quiz: structuredMCQS
    }
    if (structuredMCQS) {
        res.render("quiz.ejs", quizData);
    } else {
        res.redirect(302, "/");
    }
});

app.post("/quizresult", (req, res) => {
    const answerMCQs = req.body;

    let correctMCQS = 0;
    let wrongMCQS = 0;
    let leftMCQS = 0;

    for (const key in answerMCQs) {        
        // Removes the mcq part from the name to return the number of the mcq
        let answeredMCQNumber = parseInt(key.slice(3)) - 1; 
        let chosenMCQ = structuredMCQS.mcqs[answeredMCQNumber];

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
        quiz: structuredMCQS
    }

    console.log(quizData);

    res.render("quiz.ejs", quizData);
});

app.get("/review",(req, res)=>{
    res.render("review.ejs");
});


app.listen(PORT, ()=>{
    console.log(`Server successfully started on port ${PORT}`);
});
