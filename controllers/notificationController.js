const { prisma } = require('../config/prisma');
const { asyncHandler } = require('../middleware/errorHandler');
const { matchedData } = require('express-validator');

async function listNotifications(req, res, next) {
  try {
    const data = matchedData(req);
    const { unreadOnly, page = 1, limit = 20 } = data;

    const pageNum = Math.max(1, Number(page));
    const limitNum = Math.min(50, Math.max(1, Number(limit)));
    const skip = (pageNum - 1) * limitNum;

    const where = { userId: req.user.id };
    if (unreadOnly === 'true') {
      where.readAt = null;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limitNum,
        select: {
          id: true,
          type: true,
          title: true,
          body: true,
          linkTo: true,
          readAt: true,
          createdAt: true,
        },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { userId: req.user.id, readAt: null },
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        items: notifications,
        unreadCount,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (err) {
    next(err);
  }
}

async function markNotificationRead(req, res, next) {
  try {
    const { id } = req.params;

    const updateResult = await prisma.notification.updateMany({
      where: { id, userId: req.user.id },
      data: { readAt: new Date() },
    });

    if (updateResult.count === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    const notification = await prisma.notification.findUnique({
      where: { id },
      select: { id: true, type: true, title: true, body: true, linkTo: true, readAt: true, createdAt: true },
    });

    return res.status(200).json({ success: true, data: notification });
  } catch (err) {
    next(err);
  }
}

async function markAllNotificationsRead(req, res, next) {
  try {
    const updateResult = await prisma.notification.updateMany({
      where: { userId: req.user.id, readAt: null },
      data: { readAt: new Date() },
    });

    return res.status(200).json({
      success: true,
      message: `${updateResult.count} notifications marked as read`,
      data: { updatedCount: updateResult.count },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listNotifications: asyncHandler(listNotifications),
  markNotificationRead: asyncHandler(markNotificationRead),
  markAllNotificationsRead: asyncHandler(markAllNotificationsRead),
};