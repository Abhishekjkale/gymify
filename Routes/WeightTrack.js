const express = require('express');
const router = express.Router();

const authTokenHandler = require('../Middlewares/checkAuthToken');
const errorHandler = require('../Middlewares/errorMiddleware');
const User = require('../Models/UserSchema');

function createResponse(ok, message, data) {
    return {
        ok,
        message,
        data,
    };
}

router.post('/addweightentry', authTokenHandler, async (req, res) => {
    const { date, weightInKg } = req.body;

    if (!date || !weightInKg) {
        return res.status(400).json(createResponse(false, 'Please provide date and weight'));
    }

    const userId = req.userId;
    const user = await User.findById({ _id: userId });

    user.weight.push({
        date: new Date(date),
        weight : weightInKg,
    });

    await user.save();
    res.json(createResponse(true, 'Weight entry added successfully'));
});

router.post('/getweightbydate', authTokenHandler, async (req, res) => {
    const { date } = req.body;
    const userId = req.userId;

    const user = await User.findById({ _id: userId });

    if (!date) {
        let date = new Date();
        user.weight = filterEntriesByDate(user.weight, date);

        return res.json(createResponse(true, 'Weight entries for today', user.weight));
    }

    user.weight = filterEntriesByDate(user.weight, new Date(date));
    res.json(createResponse(true, 'Weight entries for the date', user.weight));
});


// has a bug
router.post('/getweightbylimit', authTokenHandler, async (req, res) => {
    const { limit } = req.body;

    const userId = req.userId;
    const user = await User.findById({ _id: userId });

    if (!limit) {
        return res.status(400).json(createResponse(false, 'Please provide limit'));
    } else if (limit === 'all') {
        return res.json(createResponse(true, 'All weight entries', user.weight));
    } else {
        let startDate = new Date();
        // Calculate the start date correctly for "last 'limit' days"
        // If limit is 1, it means today. If limit is 7, it means today and the 6 previous days.
        startDate.setDate(startDate.getDate() - parseInt(limit) + 1);
        startDate.setHours(0, 0, 0, 0); // Set to the beginning of that day
 
        user.weight = user.weight.filter((item) => {
            return new Date(item.date).getTime() >= startDate.getTime();
        })

        return res.json(createResponse(true, `Weight entries for the last ${limit} days`, user.weight));
    }
});

router.delete('/deleteweightentry', authTokenHandler, async (req, res) => {
    const { date } = req.body;

    if (!date) {
        return res.status(400).json(createResponse(false, 'Please provide date'));
    }

    const userId = req.userId;
    const user = await User.findById({ _id: userId });

    // Convert the target date string from req.body to a normalized YYYY-MM-DD string
    const targetDateStr = new Date(date).toISOString().split('T')[0];

    user.weight = user.weight.filter(entry => {
        const entryDateStr = entry.date.toISOString().split('T')[0];
        return entryDateStr !== targetDateStr; // Keep entries whose date is NOT the target date
    });

    await user.save();
    res.json(createResponse(true, 'Weight entry deleted successfully'));
});


// has a bug
router.get('/getusergoalweight', authTokenHandler, async (req, res) => {
    const userId = req.userId;
    const user = await User.findById({ _id: userId });

    const currentWeight = (user.weight && user.weight.length > 0) ? user.weight[user.weight.length - 1].weight : null;
    
    let goalWeight = null;
    if (user.height && user.height.length > 0 && user.height[user.height.length - 1].height) {
        goalWeight = 22 * ((user.height[user.height.length - 1].height / 100) ** 2);
        goalWeight = parseFloat(goalWeight.toFixed(2)); // Round to 2 decimal places
    }

    res.json(createResponse(true, 'User goal weight information', { currentWeight, goalWeight }));
});

router.use(errorHandler);

function filterEntriesByDate(entries, targetDate) {
    return entries.filter(entry => {
        const entryDate = new Date(entry.date);
        return (
            entryDate.getDate() === targetDate.getDate() &&
            entryDate.getMonth() === targetDate.getMonth() &&
            entryDate.getFullYear() === targetDate.getFullYear()
        );
    });
}

module.exports = router;
