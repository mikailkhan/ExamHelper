import express from 'express';
import bodyParser from 'body-parser';
import OpenAI from "openai";
import dotenv from "dotenv"
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";



const PORT = 3000;
const app = express();


dotenv.config();


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
    
    const numberOfMCQs = 5;
    const numberOfReviewQuestions = 10;
    
    const subject = req.body.subject;
    const topic = req.body.topic;
    const content = req.body.content;
    const type = req.body.type;
    let instructions = "";

    if (type == "quiz") {
        // quiz 
         instructions = `Generate a MCQ-based quiz with ${numberOfMCQs} questions from the information in the following format: Question A B C D Answer Explaination`; 
    } else {
        // Review Questions
    }

    let prompt = `{Subject: ${subject}}, \n {Topic: ${topic}}, \n {Topic Content: ${content}}`;

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
    if (structuredMCQS) {
        res.render("quiz.ejs", structuredMCQS);
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
        
        if (structuredMCQS.mcqs[answeredMCQNumber].answer == answerMCQs[key]) {
            Object.defineProperty(structuredMCQS.mcqs[answeredMCQNumber], "result", "correct");
        } 
    }
    
    console.log(structuredMCQS.mcqs);
});

app.get("/review",(req, res)=>{
    res.render("review.ejs");
});


app.listen(PORT, ()=>{
    console.log(`Server successfully started on port ${PORT}`);
});
