const express = require('express');
const app = express();
const port = 4201;
const config = require('./config');

const api = express.Router();

const mongoose = require('mongoose');
mongoose.Promise = global.Promise;
mongoose.connect(`mongodb://${config.db.user}:${config.db.password}@${config.db.host}:${config.db.port}/${config.db.name}`);
const db = mongoose.connection;
db.on('error', console.error.bind(console, 'CONNECTION ERROR: Cannot connect to my DB!!'));
db.once('open', () => {
  console.log('MONGODB EST CONNECTÉ');
});

const userSchema = new mongoose.Schema({
  email: String,
  name: {
    type: String,
    unique: true,
    required: true
  },
  role: {
    type: String,
    enum: [ 'owner', 'admin', 'member' ]
  },
  password: {
    type: String,
    required: true,
    select: false
  }
}, { collection: 'users' });
const User = mongoose.model('User', userSchema);

const bodyParser = require('body-parser');
app.use(bodyParser.json());

app.use('/api', api);

api.post('/signup', (req, res) => {
  let user = new User(req.body);
  user.role = 'member';
  user.save((err, user) => {
    if (err) { return console.log(err) }
    res.status(201).json({
      msg: `Utilisateur ${user.name} enregistré avec succès !`,
      user
    });
  });
}); // Inscription
api.post('/signin', (req, res) => {
  const user = req.body;
  const userFinded = users.find(u => u.name === user.name && u.password === user.password);
  if (!userFinded) {
    return res.status(401).json({ msg: 'Connexion refusée' });
  }
  delete userFinded.password;
  res.status(200).json({
    msg: `Bienvenue ${userFinded.name} !`,
    user: userFinded
  });
}); // Connexion
api.get('/users', (req, res) => {
  const usersWithoutPassword = users.map(user => {
    delete user.password;
    return user;
  });
  res.status(200).json({
    msg: 'Liste des utilisateur récupérée avec succès',
    users: usersWithoutPassword
  });
}); // Obtenir la liste des utilisateurs
api.get('/users/:_id', (req, res) => {
  const userId = req.params._id;
  const userFinded = users.find(u => u._id === Number(userId));
  if (!userFinded) {
    return res.status(500).json({ msg: `Pas d’utilisateur avec l’identifiant ${userId}` });
  }
  delete userFinded.password;
  res.status(200).json({
    msg: `Utilisateur ${userFinded._id} trouvé.`,
    user: userFinded
  });
}); // Obtenir les données d’un utilisateur
api.put('/users/:_id', (req, res) => { }); // Modifier les données d’un utilisateur
api.delete('/users/:_id', (req, res) => { }); // Supprimer un utilisateur

app.listen(port, () => {
  console.log(`Le serveur écoute le port ${port}...`)
});