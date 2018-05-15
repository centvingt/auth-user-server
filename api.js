const express = require('express');
const app = express();
const port = 4201;
const config = require('./config');

const crypto = require('crypto');

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
  hash: String,
  salt: String
}, { collection: 'users' });
userSchema.methods.setPassword = function (password) {
  this.salt = crypto.randomBytes(16).toString('hex');
  this.hash = crypto.pbkdf2Sync(password, this.salt, 1000, 64, 'sha512').toString('hex');
}
userSchema.methods.validPassword = function (password) {
  const hash = crypto.pbkdf2Sync(password, this.salt, 1000, 64, 'sha512').toString('hex');
  return this.hash === hash;
}
const User = mongoose.model('User', userSchema);

const bodyParser = require('body-parser');
app.use(bodyParser.json());

app.use('/api', api);

api.post('/signup', (req, res) => {
  const user = new User();
  user.role = 'member';
  user.name = req.body.name;
  user.email = req.body.email;
  user.setPassword(req.body.password);
  user.save((err, user) => {
    if (err) {
      console.log('ERREUR DANS POST/SIGNUP', err);
      return res.status(500).json({ msg: 'Erreur du serveur' });
    }
    res.status(201).json({
      msg: `Utilisateur ${user.name} enregistré avec succès !`,
      user
    });
  });
}); // Inscription
api.post('/signin', (req, res) => {
  User.findOne({ email: req.body.email }, (err, user) => {
    if (err) {
      console.log('ERREUR DANS POST/SIGNIN', err);
      return res.status(500).json({ msg: 'Erreur du serveur.' });
    }
    if (!user) { return res.status(401).json({ msg: 'Pas d’utilisateur avec cet email !' }); }
    if (!user.validPassword(req.body.password)) {
      return res.status(401).json({ msg: 'Mauvais mot de passe !' });
    }
    res.status(200).json({
      msg: `Utilisateur ${user.name} connecté avec succès !`,
      user
    });
  });
}); // Connexion
api.get('/users', (req, res) => {
  User.find((err, users) => {
    if (err) {
      console.log(('ERREUR DANS GET/USERS', err));
      return res.status(500).json({ msg: 'Erreur du serveur.' });
    }
    const usersWithoutPassword = users.map(user => {
      delete user.salt;
      delete user.hash;
      return user;
    });
    res.status(200).json({
      msg: 'Liste des utilisateur récupérée avec succès',
      users: usersWithoutPassword
    });
  });
}); // Obtenir la liste des utilisateurs
api.get('/users/:_id', (req, res) => {
  const userId = req.params._id;
  User.findById(userId, (err, user) => {
    if (err) {
      console.log('ERREUR DANS GET/USERS/_ID', err);
      return res.status(500).json({ msg: 'Erreur du serveur.' });
    }
    const userWithoutPassword = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      __v: user.__v
    }
    res.status(200).json({
      msg: 'Utilisateur trouvé',
      userWithoutPassword
    });
  });
}); // Obtenir les données d’un utilisateur
api.put('/users/:_id', (req, res) => {
  const userId = req.params._id;
  User.findByIdAndUpdate(userId, { $set: req.body }, { new: true }, (err, user) => {
    if (err) {
      console.log('ERREUR DANS PUT/USERS/_ID', err);
      return res.status(500).json({ msg: 'Erreur du serveur' });
    }
    const userWithoutPassword = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      __v: user.__v
    }
    res.status(200).json({
      msg: 'Utilisateur modifié',
      userWithoutPassword
    });
  });
}); // Modifier les données d’un utilisateur
api.delete('/users/:_id', (req, res) => {
  const userId = req.params._id;
  User.findByIdAndRemove(userId, (err, user) => {
    if (err) {
      console.log('ERREUR DANS DELETE/USERS/_ID', err);
      return res.status(500).json({ msg: 'Erreur du serveru'});
    }
    res.status(200).json({
      msg: `Utilisateur ${userId} supprimé`
    });
  });
}); // Supprimer un utilisateur

app.listen(port, () => {
  console.log(`Le serveur écoute le port ${port}...`)
});