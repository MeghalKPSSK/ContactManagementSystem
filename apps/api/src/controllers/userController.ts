import path from 'path';
import fs from 'fs';
import type { Request, Response } from 'express';
import * as userService from '../services/userService';
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
      const filePath = req.file.path;
      const fileName = req.file.filename;
      const fileExtension = path.extname(fileName).toLowerCase();

      if (!['.png', '.jpg', '.jpeg', '.gif', '.webp'].includes(fileExtension)) {
        fs.unlinkSync(filePath);
        res.status(400).json({ success: false, message: 'Only image files (png, jpg, jpeg, gif, webp) are allowed!' });
        return;
      }

      userData.profileImage = `/uploads/profiles/${fileName}`;

      try {
        const currentUser = await userService.getUserById(userId);
        if (currentUser && currentUser.profileImage) {
          const oldImagePath = path.join(__dirname, '../..', currentUser.profileImage);
          if (fs.existsSync(oldImagePath)) {
            fs.unlinkSync(oldImagePath);
          }
        }
      } catch (deleteError) {
        console.log('Could not delete old profile image:', getErrorMessage(deleteError));
      }
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
    const filePath = req.file.path;
    const fileName = req.file.filename;
    const fileExtension = path.extname(fileName).toLowerCase();

    if (fileExtension !== '.png' && fileExtension !== '.jpg' && fileExtension !== '.jpeg') {
      res.status(400).json({ success: false, message: 'Only .png, .jpg and .jpeg format allowed!' });
      return;
    }

    const updatedUser = await userService.updateUser(userId, { profileImage: filePath });

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
