import type { Request, Response } from 'express';
import * as dashboardService from '../services/dashboardService';
import { getErrorMessage, getErrorStatus } from '../utils/errors';

export const getTagsDistribution = async (req: Request, res: Response): Promise<void> => {
  const endpoint = 'GET /dashboard/tags-distribution';
  console.log(`[${endpoint}] Request received - UserId: ${req.query.userId}`);

  try {
    const tagsDistribution = await dashboardService.getTagsDistribution(req.query.userId as string);
    console.log(
      `[${endpoint}] Success - Found ${tagsDistribution.labels.length} tags, Total counts: ${tagsDistribution.counts.reduce((a, b) => a + b, 0)}`
    );

    res.status(200).json({ success: true, counts: tagsDistribution.counts, labels: tagsDistribution.labels });
  } catch (error) {
    console.error(`[${endpoint}] Error:`, getErrorMessage(error));
    res.status(getErrorStatus(error)).json({ success: false, message: 'Error fetching tags distribution' });
  }
};

export const getFavoritesCount = async (req: Request, res: Response): Promise<void> => {
  const endpoint = 'GET /dashboard/favorites-count';
  console.log(`[${endpoint}] Request received - UserId: ${req.query.userId}`);

  try {
    const favoritesCount = await dashboardService.getFavoritesCount(req.query.userId as string);
    console.log(
      `[${endpoint}] Success - Favorites: ${favoritesCount.favorite}, Regular: ${favoritesCount.regular}, Total: ${favoritesCount.favorite + favoritesCount.regular}`
    );

    res.status(200).json({ success: true, favorite: favoritesCount.favorite, regular: favoritesCount.regular });
  } catch (error) {
    console.error(`[${endpoint}] Error:`, getErrorMessage(error));
    res.status(getErrorStatus(error)).json({ success: false, message: 'Error fetching favorites count' });
  }
};

export const getGroupsStats = async (req: Request, res: Response): Promise<void> => {
  const endpoint = 'GET /dashboard/groups-stats';
  console.log(`[${endpoint}] Request received - UserId: ${req.query.userId}`);

  try {
    if (!req.query.userId) {
      console.log(`[${endpoint}] Validation failed - Missing userId parameter`);
      res.status(400).json({ success: false, message: 'UserId is required' });
      return;
    }

    const groupsStats = await dashboardService.getGroupsStatistics(req.query.userId as string);
    console.log(
      `[${endpoint}] Success - Groups: ${groupsStats.group_data.length}, Tags: ${groupsStats.tag_data.length}`
    );

    res.status(200).json({ success: true, data: groupsStats });
  } catch (error) {
    console.error(`[${endpoint}] Error:`, getErrorMessage(error));
    res.status(getErrorStatus(error)).json({ success: false, message: 'Error fetching groups statistics', error: getErrorMessage(error) });
  }
};

export const getDashboardContacts = async (req: Request, res: Response): Promise<void> => {
  const endpoint = 'GET /dashboard/contacts';
  const { userId, tags, page = '1', pageSize = '9' } = req.query as Record<string, string>;
  console.log(`[${endpoint}] Request received - UserId: ${userId}, Tags: ${tags || 'none'}, Page: ${page}, PageSize: ${pageSize}`);

  try {
    const contactsList = await dashboardService.getDashboardContacts(
      userId,
      tags ? tags.split(',') : [],
      parseInt(page, 10),
      parseInt(pageSize, 10)
    );
    console.log(`[${endpoint}] Success - Returned ${contactsList.contacts.length} contacts out of ${contactsList.total} total`);

    res.status(200).json({ success: true, contacts: contactsList.contacts, total: contactsList.total });
  } catch (error) {
    console.error(`[${endpoint}] Error:`, getErrorMessage(error));
    res.status(getErrorStatus(error)).json({ success: false, message: 'Error retrieving contacts' });
  }
};
