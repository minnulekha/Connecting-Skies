const express=require('express');
const app=express();
const path=require('path');
const port=3002;
app.use(express.static('public'))
app.get('/',(req,res)=>{res.sendFile(path.join(__dirname,'public/index.html'));})

app.get('/movies',(req,res)=>{res.sendFile(path.join(__dirname,'public/movies.html'));})

app.get('/advice',(req,res)=>{res.sendFile(path.join(__dirname,'public/advice.html'));})
app.get('/about',(req,res)=>{res.sendFile(path.join(__dirname,'public/about.html'));})
app.get('/login',(req,res)=>{res.sendFile(path.join(__dirname,'public/login.html'));})




app.listen(port,()=>{console.log(`app listening on port:${port}`);})