const jwt = require('jsonwebtoken');

module.exports = async (req, res, next) => {
    try {
        const token = req.header('authorization').split(' ')[1];
        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                return res.status(401).send({
                    success: false,
                    message: 'Un-Authorize User'
                });
            }
            req.body.id = decoded.id;
            next();
        });
    }
    catch (error) {
        console.log('Internal auth error', error);
        res.status(500).send({
            success: false,
            message: 'Please provide a valid token'
        });
    }
}