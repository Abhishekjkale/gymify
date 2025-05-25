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

router.post('/addwaterentry', authTokenHandler, async (req, res) => {
    const { date, amountInMilliliters } = req.body;

    if (!date || !amountInMilliliters) {
        return res.status(400).json(createResponse(false, 'Please provide date and water amount'));
    }

    const userId = req.userId;
    const user = await User.findById({ _id: userId });


    user.water.push({
        date: new Date(date),
        amountInMilliliters,
    });

    await user.save();


    res.json(createResponse(true, 'Water entry added successfully'));
});

router.post('/getwaterbydate', authTokenHandler, async (req, res) => {
    const { date } = req.body;
    const userId = req.userId;

    const user = await User.findById({ _id: userId });

    if (!date) {
        let date = new Date();
        user.water = filterEntriesByDate(user.water, date);

        return res.json(createResponse(true, 'Water entries for today', user.water));
    }

    user.water = filterEntriesByDate(user.water, new Date(date));
    res.json(createResponse(true, 'Water entries for the date', user.water));
});


// has a bug
router.post('/getwaterbylimit', authTokenHandler, async (req, res) => {
    const { limit } = req.body;

    const userId = req.userId;
    const user = await User.findById({ _id: userId });

    if (!limit) {
        return res.status(400).json(createResponse(false, 'Please provide limit'));
    } else if (limit === 'all') {
        return res.json(createResponse(true, 'All water entries', user.water));
    } else {
        let startDate = new Date(); 
        // Calculate the start date correctly for "last 'limit' days"
        // If limit is 1, it means today. If limit is 7, it means today and the 6 previous days.
        startDate.setDate(startDate.getDate() - parseInt(limit) + 1); 
        startDate.setHours(0, 0, 0, 0); // Set to the beginning of that day

        user.water = user.water.filter((item) => {
            return new Date(item.date).getTime() >= startDate.getTime();
        });

        return res.json(createResponse(true, `Water entries for the last ${limit} days`, user.water));
    }
});

router.delete('/deletewaterentry', authTokenHandler, async (req, res) => {
    const { date } = req.body;

    if (!date) {
        return res.status(400).json(createResponse(false, 'Please provide date'));
    }

    const userId = req.userId;
    const user = await User.findById({ _id: userId });

    // Convert the target date string from req.body to a normalized YYYY-MM-DD string
    const targetDateStr = new Date(date).toISOString().split('T')[0];

    user.water = user.water.filter(entry => {
        const entryDateStr = entry.date.toISOString().split('T')[0];
        return entryDateStr !== targetDateStr; // Keep entries whose date is NOT the target date
    });

    await user.save();
    res.json(createResponse(true, 'Water entry deleted successfully'));
});

router.get('/getusergoalwater', authTokenHandler, async (req, res) => {
    const userId = req.userId;
    const user = await User.findById({ _id: userId });

    const goalWater = 4000; // Set your goal water intake here in milliliters

    res.json(createResponse(true, 'User max water information', {goalWater }));
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
