const { CreateToken } = require('../configs/CreateToken');
const bcrypt = require('bcrypt');
const { sendOtpService, verifyOtpService } = require("./otpService");
const customerModel = require("../models/customerModel");
const customerProfileModel = require("../models/customerProfileModel");
const { ValidationError } = require('custom-error-handlers/error')


//!Login With OTP

//!Send Otp For Login
exports.sendOtpForLogin = async (req) => {
    const { email } = req.body;
    //validation will be added here

    const emailSubject = 'Verification For Login'

    //!Call a function to send Mail
    await sendOtpService(email, emailSubject, customerModel)

    return { status: "success", message: "Email Send Success For Verification" }
};

//!Customer Login
exports.customerLogin = async (req) => {

    const { email, otp, password } = req.body;

    if (password) {

        //!Find Customer With Email
        const customer = await customerModel.findOne({ email });

        if (!customer) {
            throw new ValidationError('User Not Found')
        }

        //!Match Password to Provided Password
        const isMatch = await bcrypt.compare(password, customer.password);

        if (!isMatch) {
            throw new ValidationError('Email or Password incorrect')
        }

        //!Create Token
        const token = await CreateToken(
            email, customer._id, customer.role,
            '24h'
        );

        return {
            status: "success",
            massage: "Login Seccess",
            token
        };
    } else {

        if (!otp) {
            throw new ValidationError('OTP is required')
        }

        //!Call a function to validate OTP for login
        await verifyOtpService(email, otp, customerModel);

        //!Find Customer With Email
        const customer = await customerModel.findOne({ email });

        //!Create Token
        const token = await CreateToken(
            email, customer['_id'], customer['role'],
            '24h'
        );

        return { status: "success", message: "Login Success", token }
    }
};

//!Customer Logout
exports.customerLogout = () => {
    return {
        status: "success",
        massage: "Logout Seccess"
    };
};

//!Customer Profile Read Service
exports.customerProfileRead = async (req) => {
    const customerId = req.headers.id;

    //!Find Customer Profile
    const profile = await customerProfileModel.find({ customerId });

    if (!profile) {
        return { status: 'fail', error: 'Profile Not Found' }
    }

    return { status: "success", data: profile }
};

//!Customer Profile Update Service
exports.customerProfileUpdate = async (req) => {
    const reqBody = req.body;
    const customerId = req.headers.id;

    //!Push Customer ID
    reqBody.customerId = customerId

    //!Find And Update Customer Profile
    const profile = await customerProfileModel.updateOne(
        { customerId: customerId },
        { $set: reqBody },
        { upsert: true }
    );

    return { status: "success", message: "Profile Save Changed!", data: profile };
};

//!Customer Password Update
exports.customerPasswordUpdate = async (req) => {
    const { password, confirmPassword } = req.body;
    const customerEmail = req.headers.email;

    if (!password) {
        throw new ValidationError('Password is required')
    }
    if (password.length < 6) {
        throw new ValidationError('Password must be at least 6 characters long')
    }
    if (!confirmPassword) {
        throw new ValidationError('Confirm Password is required')
    }
    if (!(password === confirmPassword)) {
        throw new ValidationError('Password and Confirm Password must be same')
    }

    //!Password Hash
    const hashedPassword = await bcrypt.hash(password, 12)

    //!find And Update Customer Password
    await customerModel.updateOne({ email: customerEmail }, { $set: { password: hashedPassword } }, { upsert: true });

    return { status: "success", message: "Password Save Changed!" }

};

//!Customer Otp Send For Update Email Update
exports.customerSendOtpForChangeEmailService = async (req) => {
    const { email } = req.body;
    const customerId = req.headers.id;
    const emailSubject = 'Email Verification For Email Change';

    if (!email) {
        throw new ValidationError('Email is required')
    }

    const existingEmail = await customerModel.findOne({ email });

    if (existingEmail) {
        throw new ValidationError('Email Already in use')
    }

    await sendOtpService(email, emailSubject, customerModel, customerId)

    return { status: "success", message: "Email Sent Success For Email Verification" }

};

//!customer Email Update Service
exports.customerEmailUpdateService = async (req) => {
    const { email, otp } = req.body;
    const customerId = req.headers.id;

    if (!email) {
        throw new ValidationError('Email is required')
    }
    if (!otp) {
        throw new ValidationError('Otp is required')
    }

    await verifyOtpService(email, otp, customerModel, customerId);

    const emailUpdate = await customerModel.updateOne(
        { _id: customerId },
        { email }
    );

    if (!emailUpdate) {
        throw new ValidationError('Email update failed')
    }

    return { status: 'Success', massage: 'Email has been Updated' }
};








