import type { Request, Response, NextFunction } from 'express';
import * as groupService from '../services/groupService';
import { encryptId } from '../utils/dbEncryption';
import { getErrorStatus } from '../utils/errors';
import { paramStr } from '../utils/http';

export const saveGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const groupData = req.body;
    if (req.file) {
      groupData.group_icon = req.file.filename;
    }
    const groupId = encryptId(await groupService.groupSave(groupData));
    console.log(`Group created with ID: ${groupId}`);
    res.status(201).json({ success: true, uid: groupId, message: 'Group added successfully' });
  } catch (error) {
    console.error('Error adding group:', error);
    res.status(getErrorStatus(error)).json({ success: false, message: 'Error adding group' });
  }
};

export const listGroups = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, filter, page = '1', pageSize = '10' } = req.query as Record<string, string>;
    const result = await groupService.getGroupsList(
      userId,
      filter,
      parseInt(page, 10),
      parseInt(pageSize, 10)
    );
    res.status(200).json({
      success: true,
      groups: result.items,
      pagination: { current: result.page, pageSize: result.pageSize, total: result.total },
      message: 'Groups list retrieved successfully',
    });
  } catch (error) {
    console.error('Error retrieving groups:', error);
    res.status(getErrorStatus(error)).json({ success: false, message: 'Error retrieving groups' });
  }
};

export const getGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const requestedPage = Number.parseInt(String(req.query.page || '1'), 10);
    const requestedPageSize = Number.parseInt(String(req.query.pageSize || '10'), 10);
    const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const pageSize = [10, 20, 50, 100].includes(requestedPageSize) ? requestedPageSize : 10;
    const group = await groupService.getGroupById(paramStr(req.params.id), page, pageSize);

    if (!group) {
      res.status(404).json({ success: false, message: 'Group not found' });
      return;
    }

    res.status(200).json({
      success: true,
      group,
      pagination: { current: page, pageSize, total: group.membersTotal },
    });
  } catch (error) {
    console.error('Error retrieving group:', error);
    res.status(getErrorStatus(error)).json({ success: false, message: 'Error retrieving group' });
  }
};

export const deleteGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const groupId = paramStr(req.params.id);
    console.log(`Group UID for Deletion: ${groupId}`);
    const result = await groupService.deleteGroup(groupId);
    if (result) {
      res.status(200).json({ success: true, message: 'Group deleted successfully' });
    } else {
      res.status(404).json({ success: false, message: 'Group not found' });
    }
  } catch (error) {
    console.error('Error deleting group:', error);
    res.status(getErrorStatus(error)).json({ success: false, message: 'Error deleting group' });
  }
};

// Only runs multipart parsing when the request is multipart/form-data; otherwise passes through to updateGroup.
export const maybeParseGroupIcon = (upload: { single: (field: string) => import('express').RequestHandler }) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (req.headers['content-type']?.includes('multipart/form-data')) {
      upload.single('group_icon')(req, res, next);
    } else {
      next();
    }
  };
};

export const updateGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const groupData = req.body;
    if (req.file) {
      groupData.group_icon = req.file.filename;
    }
    if (typeof groupData.members === 'string') {
      groupData.members = JSON.parse(groupData.members);
    }
    const result = await groupService.updateGroup(paramStr(req.params.id), groupData);

    if (result) {
      res.status(200).json({ success: true, message: 'Group updated successfully' });
    } else {
      res.status(404).json({ success: false, message: 'Group not found' });
    }
  } catch (error) {
    console.error('Error updating group:', error);
    res.status(getErrorStatus(error)).json({ success: false, message: 'Error updating group' });
  }
};

export const addGroupMembers = async (req: Request, res: Response): Promise<void> => {
  try {
    const groupId = paramStr(req.params.groupId);
    const { memberIds } = req.body;

    if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
      res.status(400).json({ success: false, message: 'Invalid member IDs provided' });
      return;
    }

    const result = await groupService.addGroupMembers(groupId, memberIds);

    if (result) {
      res.status(200).json({
        success: true,
        message: `${memberIds.length} member${memberIds.length !== 1 ? 's' : ''} added successfully`,
      });
    } else {
      res.status(500).json({ success: false, message: 'Failed to add members' });
    }
  } catch (error) {
    console.error('Error adding members:', error);
    res.status(getErrorStatus(error)).json({ success: false, message: 'Error adding members' });
  }
};

export const removeGroupMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const groupId = paramStr(req.params.groupId);
    const memberId = paramStr(req.params.memberId);

    const result = await groupService.removeGroupMember(groupId, memberId);

    if (result) {
      res.status(200).json({ success: true, message: 'Member removed successfully' });
    } else {
      res.status(404).json({ success: false, message: 'Member not found in group' });
    }
  } catch (error) {
    console.error('Error removing member:', error);
    res.status(getErrorStatus(error)).json({ success: false, message: 'Error removing member' });
  }
};
