const userModel = require('../models/userModel');

module.exports = async (req, res, next) => {
    try {
        const user = await userModel.findById(req.body.id);
        if (user.usertype !== 'admin') {
            return res.status(401).json({ 
                success: false,
                message: 'Admin access denied' 
            });
        }
        else {
        next();
        }
    }
    catch (error) {
        console.log('Internal admin middleware error', error);
    }
};
