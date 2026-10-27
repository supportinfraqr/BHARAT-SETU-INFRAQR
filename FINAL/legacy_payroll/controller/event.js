const mongoose = require('mongoose');
const { initModels } = require('../models/indexModel');


exports.addEvent = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({ status: 'error', message: 'org uuid not found' });
        }

        const { EventModel } = await initModels(org_uuid);
        const createId = req.userId;

        const { eventName, description, date, type ,organizationId} = req.body;

        const newEvent = new EventModel({
            eventName,
            description,
            date,
            type,
            organizationId,
            createdBy: createId,
        });

        const savedEvent = await newEvent.save();

        return res.status(201).json({
            status: 'success',
            message: 'Event added successfully',
            data: savedEvent,
        });
    } catch (error) {
        console.error('Error adding event:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error', error: error.message
        });
    }
};

exports.updateEvent = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({ status: 'error', message: 'org uuid not found' });
        }

        const { EventModel } = await initModels(org_uuid);

        const { eventId } = req.params;
        const { eventName, description, date, status, type } = req.body;

        const event = await EventModel.findById(eventId);
        if (!event) {
            return res.status(404).json({ status: 'error', message: 'Event not found' });
        }

        event.eventName = eventName || event.eventName;
        event.description = description || event.description;
        event.date = date || event.date;
        event.type = type || event.type;
        event.status = status || event.status;

        const updatedEvent = await event.save();

        return res.status(200).json({
            status: 'success',
            message: 'Event updated successfully',
            data: updatedEvent,
        });
    } catch (error) {
        console.error('Error updating event:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error', error: error.message
        });
    }
};

exports.deleteEvent = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({ status: 'error', message: 'org uuid not found' });
        }

        const { EventModel } = await initModels(org_uuid);

        const { eventId } = req.params;

        const event = await EventModel.findByIdAndDelete(eventId);
        if (!event) {
            return res.status(404).json({ status: 'error', message: 'Event not found' });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Event deleted successfully',
        });
    } catch (error) {
        console.error('Error deleting event:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error', error: error.message
        });
    }
};

exports.getEventById = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({ status: 'error', message: 'org uuid not found' });
        }

        const { EventModel } = await initModels(org_uuid);

        const { eventId } = req.params;

        const event = await EventModel.findById(eventId);
        if (!event) {
            return res.status(404).json({ status: 'error', message: 'Event not found' });
        }

        return res.status(200).json({
            status: 'success',
            message: 'Event retrieved successfully',
            data: event,
        });
    } catch (error) {
        console.error('Error retrieving event:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error', error: error.message
        });
    }
};

exports.getAllEvents = async (req, res) => {
    try {
        const org_uuid = req.headers.org_uuid;
        if (!org_uuid) {
            return res.status(404).json({ status: 'error', message: 'org uuid not found' });
        }

        const { EventModel } = await initModels(org_uuid);

        const {
            page = 1,
            limit = 10,
            eventName = '',
            type = '',
            status = '',
            startDate,
            endDate,
        } = req.query;

        const pageInt = parseInt(page, 10);
        const limitInt = parseInt(limit, 10);

        const searchFilter = {
            ...(eventName && { eventName: { $regex: eventName, $options: 'i' } }),
            ...(type && { type }),
            ...(status && { status }),
        };

        if (startDate && endDate) {
            searchFilter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
        } else if (startDate) {
            searchFilter.date = { $gte: new Date(startDate) };
        } else if (endDate) {
            searchFilter.date = { $lte: new Date(endDate) };
        }

        const totalEvents = await EventModel.countDocuments(searchFilter);

        const events = await EventModel.find(searchFilter)
            .sort({ date: 1 })
            .skip((pageInt - 1) * limitInt)
            .limit(limitInt);

        return res.status(200).json({
            status: 'success',
            message: 'Events retrieved successfully',
            data: events,
            pagination: {
                total: totalEvents,
                page: pageInt,
                limit: limitInt,
                totalPages: Math.ceil(totalEvents / limitInt),
            },
        });
    } catch (error) {
        console.error('Error retrieving events:', error);
        return res.status(500).json({
            status: 'error',
            message: 'Internal Server Error', error: error.message
        });
    }
};
