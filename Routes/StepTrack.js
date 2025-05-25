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

router.post('/addstepentry', authTokenHandler, async (req, res) => {
    const { date, steps } = req.body;

    if (!date || !steps) {
        return res.status(400).json(createResponse(false, 'Please provide date and steps count'));
    }

    const userId = req.userId;
    const user = await User.findById({ _id: userId });

    user.steps.push({
        date: new Date(date),
        steps,
    });

    await user.save();
    res.json(createResponse(true, 'Steps entry added successfully'));
});

router.post('/getstepsbydate', authTokenHandler, async (req, res) => {
    const { date } = req.body;
    const userId = req.userId;

    const user = await User.findById({ _id: userId });

    if (!date) {
        let date = new Date();
        user.steps = filterEntriesByDate(user.steps, date);

        return res.json(createResponse(true, 'Steps entries for today', user.steps));
    }

    user.steps = filterEntriesByDate(user.steps, new Date(date));
    res.json(createResponse(true, 'Steps entries for the date', user.steps));
});



router.post('/getstepsbylimit', authTokenHandler, async (req, res) => {
    const { limit } = req.body;

    const userId = req.userId;
    const user = await User.findById({ _id: userId });

    if (!limit) {
        return res.status(400).json(createResponse(false, 'Please provide limit'));
    } else if (limit === 'all') {
        return res.json(createResponse(true, 'All steps entries', user.steps));
    } else {
        let startDate = new Date();
        // Calculate the start date correctly for "last 'limit' days"
        // If limit is 1, it means today. If limit is 7, it means today and the 6 previous days.
        startDate.setDate(startDate.getDate() - parseInt(limit) + 1);
        startDate.setHours(0, 0, 0, 0); // Set to the beginning of that day

        user.steps = user.steps.filter((item) => {
            return new Date(item.date).getTime() >= startDate.getTime();
        })

        return res.json(createResponse(true, `Steps entries for the last ${limit} days`, user.steps));
    }
});

router.delete('/deletestepentry', authTokenHandler, async (req, res) => {
    const { date } = req.body;

    if (!date) {
        return res.status(400).json(createResponse(false, 'Please provide date'));
    }

    const userId = req.userId;
    const user = await User.findById({ _id: userId });

    // Convert the target date string from req.body to a normalized YYYY-MM-DD string
    const targetDateStr = new Date(date).toISOString().split('T')[0];

    user.steps = user.steps.filter(entry => {
        const entryDateStr = entry.date.toISOString().split('T')[0];
        return entryDateStr !== targetDateStr; // Keep entries whose date is NOT the target date
    });

    await user.save();
    res.json(createResponse(true, 'Steps entry deleted successfully'));
});



router.get('/getusergoalsteps', authTokenHandler, async (req, res) => {
    const userId = req.userId;
    const user = await User.findById({ _id: userId });

    let totalSteps = 0;

    if(user.goal == "weightLoss"){
        totalSteps = 10000;
    }
    else if(user.goal == "weightGain"){
        totalSteps = 5000;
    }
    else{
        totalSteps = 7500;
    }   

    res.json(createResponse(true, 'User steps information', { totalSteps }));
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
