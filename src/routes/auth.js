const express = require('express');
const bcrypt = require('bcrypt');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const User = require('../models/User.model');

const AuthRouter = express.Router();

// max age
const maxAge = 3 * 24 * 60 * 60 * 60;
const createToken = (user) => {
  return jwt.sign({ ...user }, 'asodjijiej3q9iej93qjeiqwijdnasdini', {
    expiresIn: '120',
  });
};

AuthRouter.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const { token } = req.headers;

  try {
    const user = await User.login(email, password);
    try {
      const verifyToken = jwt.verify(
        token,
        'asodjijiej3q9iej93qjeiqwijdnasdini',
      );
      res.status(200).json({ jwt: token });
    } catch (err) {
      res.status(400).json({ message: 'token might expired' });
    }
  } catch (err) {
    const errors = handleErrors(err);
    res.status(400).json({ errors });
  }
});

AuthRouter.post('/signup', async (req, res) => {
  console.log(req.body);
  const { email, password, username, name } = req.body;

  try {
    const user = new User({ email, password, username, name });
    await user.save();
    console.log(user);

    const token = createToken(user);
    // const p = jwt.verify(token, 'asodjijiej3q9iej93qjeiqwijdnasdini');
    // console.log(p._doc);

    /*
      {
        meta: { follows: [], accountCreated: '2021-04-11T15:02:40.836Z' },
        points: 0,
        isAccountVerified: false,
        role: [],
        _id: '60730f900a6ecb2a4ccbe984',
        email: 'sad@gmail.com',
        password: oops,
        username: 'aldhanekaa',
        name: 'Aldhaneka',
        socialMedias: [],
        __v: 0
      }
    */

    // res.cookie('jwt', token, { httpOnly: true, maxAge: maxAge * 1000 });
    res.status(201).json({ token: token });
  } catch (err) {
    const errors = handleErrors(err);
    console.log(errors);
    res.status(400).json({ errors });
  }
});

module.exports = AuthRouter;

// handle errors
function handleErrors(err) {
  console.log(err.message, err);
  let errors = {};

  // incorrect email
  if (err.message === 'incorrect email') {
    errors.email = 'That email is not registered';
  }

  // incorrect password
  if (err.message === 'incorrect password') {
    errors.password = 'That password is incorrect';
  }

  // duplicate email error
  if (err.code === 11000) {
    errors.email = 'that email is already registered';
    return errors;
  }

  // validation errors
  if (err._message.includes('User validation failed')) {
    // console.log(err);
    Object.values(err.errors).forEach(({ properties }) => {
      // console.log(val);
      // console.log(properties);
      console.log(properties.path);
      if (properties.message != '') {
        errors[properties.path] = properties.message;
      }
    });
  }

  return errors;
}