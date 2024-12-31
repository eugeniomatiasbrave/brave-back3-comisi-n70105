import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { ExtractJwt, Strategy as JWTStrategy } from "passport-jwt";
import { usersService, cartsService } from "../services/repositories.js";
import AuthService from "../services/AuthService.js";
import dotenv from 'dotenv';
dotenv.config();

const SECRET_KEY = process.env.SECRET_KEY;
const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PWD = process.env.ADMIN_PWD;

const initializePassportConfig = () => {
    
    passport.use('register', new LocalStrategy({
        usernameField: 'email',
        passReqToCallback: true
    }, async (req, email, password, done) => {
        try {
            const { firstName, lastName, birthDate } = req.body;
            if (!firstName || !lastName) {
                return done(null, false, { message: 'Incomplete values' });
            }
            const user = await usersService.getUserByEmail(email);
            if (user) {
                return done(null, false, { message: "User already exists" });
            }
            let parsedDate;
            if (birthDate) {
                parsedDate = new Date(birthDate).toISOString();
            }
            const authService = new AuthService();
            const hashedPassword = await authService.hashPassword(password);

            let role = 'user';
            if (email === ADMIN_USER && password === ADMIN_PWD) {
                role = 'admin';
            }
            // creo el carrito para el user
            const newCart = await cartsService.createCart();

            const newUser = {
                firstName,
                lastName,
                email,
                birthDate: parsedDate,
                password: hashedPassword,
                role,
                cartId: newCart._id // Initialize cartId as null
            };
            const result = await usersService.createUser(newUser);
            
            const cart = await cartsService.getCartById(result.cartId);
            result.cartId = cart._id;
            return done(null, result);
        } catch (error) {
            return done(error);
        }
    }));

    passport.use('login', new LocalStrategy({ usernameField: 'email'}, async (email, password, done) => {
        try {

            if( email === ADMIN_USER && password === ADMIN_PWD){
                return done(null,{_id:0, firstName:"Administrador", role:"admin"})
            }

            const user = await usersService.getUserByEmail(email);

            if (!user) {
                return done(null, false, { message: "Incorrect credentials" });
            }
            const authService = new AuthService();
            const isValidPassword = await authService.validatePassword(password, user.password);
            if (!isValidPassword) {
                return done(null, false, { message: "Incorrect credentials" });
            }

            return done(null, user);
        } catch (error) {
            return done(error);
        }
    }));

   
    passport.use('current', new JWTStrategy({
        secretOrKey: SECRET_KEY,
        jwtFromRequest: ExtractJwt.fromExtractors([cookieExtractor])
    }, async (tokenData, done) => {
        try {
            return done(null,tokenData);
        } catch (error) {
            return done(error);
        }
    }));

    /* Para mas adelante en otras implementaciones
    
    passport.serializeUser((user, done) => {
        done(null, user._id);
    });

    passport.deserializeUser(async (id, done) => {
        try {
            const user = await usersService.getUserById(id);
            done(null, user);
        } catch (error) {
            done(error);
        }
    });
    */

};

function cookieExtractor(req) {
    return req?.cookies?.['tokencito'];
}

export default initializePassportConfig;
