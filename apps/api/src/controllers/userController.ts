import type { Request, Response } from 'express';
import * as userService from '../services/userService';
import { persistUploadedImage } from '../lib/imageStorage';
import { encryptId } from '../utils/dbEncryption';
import { getErrorMessage, getErrorStatus } from '../utils/errors';
import { paramStr } from '../utils/http';

export const registerUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = encryptId(await userService.registerUser(req.body));
    console.log(`User created with ID: ${userId}`);
    res.status(201).json({ success: true, uid: userId, message: 'User registered successfully' });
  } catch (error) {
    console.error(`Error registering user: ${getErrorMessage(error)}`);
    res.status(getErrorStatus(error)).json({ success: false, message: 'Error registering user', error: getErrorMessage(error) });
  }
};

export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = await userService.loginUser(req.body);
    console.log(`User Session details: ${JSON.stringify(user)}`);
    res.status(200).json({ success: true, message: 'User Logged In successfully', user });
  } catch (error) {
    console.error(`Invalid User: ${getErrorMessage(error)}`);
    res.status(200).json({ success: false, message: 'Invalid User' });
  }
};

export const updateUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = paramStr(req.params.id);
    const userData = req.body;

    if (req.file) {
      userData.profileImage = await persistUploadedImage(req.file, 'profiles');
    }

    const updatedUser = await userService.updateUser(userId, userData);
    if (!updatedUser) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const user = await userService.getUserById(userId);
    res.status(200).json({ success: true, user, message: 'User updated successfully' });
  } catch (error) {
    console.error(`Error updating user: ${getErrorMessage(error)}`);
    res.status(getErrorStatus(error)).json({ success: false, message: 'Error updating user', error: getErrorMessage(error) });
  }
};

export const listUsers = async (_req: Request, res: Response): Promise<void> => {
  try {
    const users = await userService.getUsersList();
    res.status(200).json({ success: true, users, message: 'Users list retrieved successfully' });
  } catch (error) {
    console.error(`Error retrieving users list: ${getErrorMessage(error)}`);
    res.status(getErrorStatus(error)).json({ success: false, message: 'Error retrieving users list', error: getErrorMessage(error) });
  }
};

export const getUser = async (req: Request, res: Response): Promise<void> => {
  try {
    console.log(`User UID: ${req.params.id}`);
    const user = await userService.getUserById(paramStr(req.params.id));
    if (!user) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    console.log(`User details: ${JSON.stringify(user)}`);
    res.status(200).json({ success: true, user, message: 'User retrieved successfully' });
  } catch (error) {
    console.error(`Error retrieving user: ${getErrorMessage(error)}`);
    res.status(getErrorStatus(error)).json({ message: 'Error retrieving user', error: getErrorMessage(error) });
  }
};

export const deleteUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = paramStr(req.params.id);
    console.log(`User UID for Deletion: ${userId}`);
    const result = await userService.deleteUser(userId);
    if (result) {
      res.status(200).json({ success: true, message: 'User deleted successfully' });
    } else {
      res.status(404).json({ success: false, message: 'User not found' });
    }
  } catch (error) {
    console.error(`Error deleting user: ${getErrorMessage(error)}`);
    res.status(getErrorStatus(error)).json({ success: false, message: 'Error deleting user', error: getErrorMessage(error) });
  }
};

export const changePassword = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = paramStr(req.params.id);
    const { currentPassword, newPassword } = req.body;
    const result = await userService.changePassword(userId, currentPassword, newPassword);

    if (result) {
      res.status(200).json({ success: true, message: 'Password changed successfully' });
    } else {
      res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }
  } catch (error) {
    console.error(`Error changing password: ${getErrorMessage(error)}`);
    res.status(getErrorStatus(error)).json({ success: false, message: getErrorMessage(error) });
  }
};

export const uploadProfileImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = paramStr(req.params.id);
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    const imageRef = await persistUploadedImage(req.file, 'profiles');
    const updatedUser = await userService.updateUser(userId, { profileImage: imageRef });

    if (!updatedUser) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    res.status(200).json({ success: true, message: 'Profile image uploaded successfully', user: updatedUser });
  } catch (error) {
    console.error(`Error uploading profile image: ${getErrorMessage(error)}`);
    res.status(getErrorStatus(error)).json({ success: false, message: 'Error uploading profile image', error: getErrorMessage(error) });
  }
};

export const updatePlan = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = paramStr(req.params.id);
    const { plan } = req.body;
    if (!plan) {
      res.status(400).json({ success: false, message: 'Plan is required' });
      return;
    }

    const updated = await userService.updatePlan(userId, plan);
    if (!updated) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }

    const user = await userService.getUserById(userId);
    res.status(200).json({ success: true, message: 'Plan updated successfully', user });
  } catch (error) {
    console.error(`Error updating plan: ${getErrorMessage(error)}`);
    res.status(getErrorStatus(error)).json({ success: false, message: getErrorMessage(error) });
  }
};

export const getPreferences = async (req: Request, res: Response): Promise<void> => {
  try {
    const preferences = await userService.getUserPreferences(paramStr(req.params.id));
    res.status(200).json({ success: true, preferences });
  } catch (error) {
    res.status(getErrorStatus(error)).json({ success: false, message: getErrorMessage(error) });
  }
};

export const updatePreferences = async (req: Request, res: Response): Promise<void> => {
  try {
    const preferences = await userService.updateUserPreferences(paramStr(req.params.id), req.body);
    res.status(200).json({ success: true, preferences, message: 'Preferences saved' });
  } catch (error) {
    res.status(getErrorStatus(error)).json({ success: false, message: getErrorMessage(error) });
  }
};
