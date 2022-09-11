const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const mongoose = require('mongoose')
const bodyParser = require('body-parser')

const uri = process.env.MONGO_URI;
mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const connection = mongoose.connection;
connection.on('error', console.error.bind(console, 'connection error'));
connection.once('open', () => {
  console.log("MongoDB database connection established successfully");
})

const Schema = mongoose.Schema;
const userSchema = new Schema({
  user_name: {type: String, required: true}
});
const User = mongoose.model('User', userSchema);

const exerciseSchema = new Schema({
  user_id: String,
  description: { type: String, required: true },
  duration: {type: Number, required: true},
  date: Date
});
const Exercise = mongoose.model('Exercise', exerciseSchema);

app.use(bodyParser.urlencoded({
  extended: false
}))
app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.get('/api/users', async (req, res) => {
  let users = await User.find({}).select('user_name _id');
  let allUsers = [];
  
  if(users){
    allUsers = users.map((x) => { return {username: x.user_name, _id: x._id }})
  }
  // res.json({
  //   user_name: users.user_name,
  //   _id: users._id
  // });
  res.json(allUsers);
})

app.post('/api/users', async (req, res) => {
  const userName = req.body.username;

  if(userName){
    let newUser = new User({
      user_name: userName
    });
    await newUser.save();
    
    let findUser = await User.findOne({user_name: userName})
    
    if(findUser) res.json({username: findUser.user_name, _id: findUser._id})
    else res.json({error: 'User not found'})
  } else {
    res.json({error: 'Enter user id'})
  }
})

app.post('/api/users/:_id/exercises', async (req, res) => {
  const params = req.body;
  const date = params.date ? new Date(params.date) : new Date();
  
  addExercise = new Exercise({
    user_id: params[':_id'],
    description: params.description,
    duration: params.duration,
    date: date
  });
  
  let findUser = await User.findOne({_id: params[':_id']});
  if(findUser){  
    await addExercise.save();
    res.json({
      _id: findUser._id,
      username: findUser.user_name,
      date: addExercise.date.toDateString(),
      duration: addExercise.duration,
      description: addExercise.description
    });
  }
  else{
    res.json({error: 'User id not found'})
  }
})

app.get('/api/users/:_id/logs/:from?/:to?/:limit?', async (req, res) => {
  const userId = req.params ? req.params._id : '';
  
  let query = Exercise.find({user_id: userId});
  
  if(req.params && req.params.from && !req.params.to){
    query.find({ date: {"$gte": req.params.from} })
  }
  else if (req.params && req.params.from && req.params.to){
    query.find({ 
      date: {"$gte": req.params.from, "$lte": req.params.to}
    })
  }

  if(req.params && req.params.limit){
    query.limit(req.params.limit)
  }

  console.log(query)

  let exercises = await query.exec();
  
  let user = await User.findOne({_id: userId});

  if(user && exercises){
    const logs = exercises.map((x) => {
      return {description: x.description, duration: x.duration, date: x.date.toDateString()}
    });
    
    res.json({
        username: user.user_name,
        count: exercises.length,
        _id: userId,
        log: logs
    }); 
  } else {
    res.status(404).json({error: 'Records not found'})
  } 
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
