if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

import * as express from 'express';
import * as jwt from 'jsonwebtoken';
import User, { UserBaseDocument, UserInterface } from '../models/User.model';
import Role from '../models/Role.model';
import { VerifyAuthToken } from '../controllers/checkToken';

import createToken, { tokenForTypes } from '../controllers/createToken';
const AuthRouter = express.Router();

AuthRouter.post('/new/role', VerifyAuthToken, async (req, res) => {
  const { rolename } = req.body;
  // const { token } = req.headers;
  // console.log(req.headers);

  try {
    const isThereThisRole = await Role.findOne({ name: rolename });
    if (isThereThisRole) {
      res.status(200).json({ message: 'role already registered' });
      return;
    } else {
      const role = new Role({
        name: rolename,
      });
      await role.save();
      res.status(200).json({ message: 'success' });
    }
  } catch (err) {
    console.log('ERR! ', err);

    const errors = await handleErrors(err);
    console.log(errors);
    res.status(200).json({ errors });
  }
});

AuthRouter.post('/login', async (req, res) => {
  const { username, password } = req.body;
  // const { token } = req.headers;
  // console.log(req.headers);

  try {
    const user = await User.login(username, password);
    const token = createToken(
      {
        username: user.username,
        password: user.password,
        _id: user._id,
        email: user.email,
      },
      tokenForTypes.auth,
    );

    res.status(200).json({
      message: 'success',
      token: token,
      user: {
        name: user.name,
        username: user.username,
        password: user.password,
        email: user.email,
        _id: user._id,
        follows: user.follows,
        roles: user.roles,
        isAccountVerified: user.isAccountVerified,
        socialMedias: user.socialMedias,
      },
    });
  } catch (err) {
    console.log('ERR! ', err);

    const errors = await handleErrors(err);
    console.log(errors);
    res.status(200).json({ errors });
  }
});

AuthRouter.post('/checkJWT', async (req, res) => {
  // const token = req.headers.authorizations;
  if (req.body.token) {
    try {
      const verifyToken = await jwt.verify(
        req.body.token,
        process.env.AUTH_SECRET_TOKEN || 'authSecret',
      );

      // @ts-ignore
      if (typeof verifyToken != 'string' && verifyToken.password) {
        // @ts-ignore
        const user = await User.findById(verifyToken._id);

        // @ts-ignore
        if (verifyToken.password != user?.password) {
          res
            .status(200)
            .json({ message: 'invalid password, password might has changed' });
          return;
        } else {
          res.status(200).json({
            message: 'success',
            user: {
              follows: user?.follows,
              name: user?.name,
              username: user?.username,
              email: user?.email,
              accountCreated: user?.accountCreated,
              isAccountVerified: user?.isAccountVerified,
              roles: user?.roles,
              socialMedias: user?.socialMedias,
            },
          });
          return;
        }
      }
    } catch (err) {
      res.status(200).json({ message: 'invalid token' });
      return;
    }

    // console.log(token.split(' '));
  }

  res.json({ message: 'token undefined' });
  return;
});

AuthRouter.get('/checkJWT/:token', async (req, res) => {
  const token = req.params.token;
  if (token) {
    try {
      const verifyToken = await jwt.verify(
        token,
        process.env.AUTH_SECRET_TOKEN || 'authSecret',
      );

      // @ts-ignore
      if (typeof verifyToken != 'string' && verifyToken.password) {
        // @ts-ignore
        const user = await User.findById(verifyToken._id);

        // @ts-ignore
        if (verifyToken.password != user?.password) {
          res
            .status(200)
            .json({ message: 'invalid password, password might has changed' });
          return;
        } else {
          res.status(200).json({
            message: 'success',
            user: {
              follows: user?.follows,
              name: user?.name,
              username: user?.username,
              email: user?.email,
              accountCreated: user?.accountCreated,
              isAccountVerified: user?.isAccountVerified,
              roles: user?.roles,
              socialMedias: user?.socialMedias,
            },
          });
          return;
        }
      }
    } catch (err) {
      res.status(200).json({ message: 'invalid token' });
      return;
    }

    // console.log(token.split(' '));
  }

  res.json({ message: 'token undefined' });
  return;
});

AuthRouter.post('/signup', async (req, res) => {
  // console.log(req.body);
  const { email, password, username, name } = req.body;

  try {
    const user = new User({ email, password, username, name });
    await user.save();

    // console.log(user);

    const token = createToken(
      {
        username: user.username,
        password: user.password,
        _id: user._id,
        email: user.email,
      },
      tokenForTypes.auth,
    );
    res.status(200).json({
      message: 'success',
      token: token,
      user: {
        name: user.name,
        username: user.username,
        password: user.password,
        email: user.email,
        _id: user._id,
        follows: user.follows,
        roles: user.roles,
        isAccountVerified: user.isAccountVerified,
        socialMedias: user.socialMedias,
      },
    });
  } catch (err) {
    const errors = await handleErrors(err, { email, password, username, name });
    res.status(200).json({ errors });
  }
});

interface SignupBody {
  email: string;
  password: string;
  username: string;
  name: string;
}

interface Errors {
  email: string;
  password: string;
  username: string;
}

// handle errors
async function handleErrors(
  err: {
    message: string;
    code: number;
    _message: string;
    keyValue: {
      username?: string;
      email?: string;
    };
  },
  SignupBody?: SignupBody,
) {
  // console.log('ERRRRORORR', err.message);
  // @ts-ignore
  let errors: Errors = {};

  if (err.message == 'Only Letters and Numbers are allowed') {
    errors.username = err.message;
  }
  if (err.message === 'incorrect username') {
    // incorrect email
    errors.username = 'That username is not registered';
  }

  // incorrect password
  if (err.message === 'incorrect password') {
    errors.password = 'That password is incorrect';
  }

  // @ts-ignore
  // console.log(err.keyValue);

  // duplicate username error
  if (err.code === 11000 && err.keyValue.username) {
    errors.username = 'that username is already registered';
  }

  if (errors.username && SignupBody && SignupBody.email) {
    const similarUser = await User.findOne({ email: SignupBody.email });
    if (similarUser) {
      errors.email = 'that email is already registered';
    }
  }
  // User.findOne({email: })

  // duplicate email error
  if (err.code === 11000 && err.keyValue.email) {
    errors.email = 'that email is already registered';
  }

  if (errors.email && SignupBody && SignupBody.username) {
    const similarUser = await User.findOne({ username: SignupBody.username });
    if (similarUser) {
      errors.username = 'that username is already registered';
    }
  }

  // validation errors
  if (err._message && err._message.includes('User validation failed')) {
    // console.log(err);

    // @ts-ignore
    Object.values(err.errors).forEach(({ properties }) => {
      // console.log(val);
      // console.log(properties);
      console.log(properties.path);
      if (properties.message != '') {
        // @ts-ignore
        errors[properties.path] = properties.message;
      }
    });
  }

  return errors;
}

export default AuthRouter;
