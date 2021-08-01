import HasuraHttpClient from "./client.js";
import User from "./types/User.js";
import { USER_TABLE, OTP_TABLE } from "../config/settings.js";
export default class UserClient extends HasuraHttpClient {
    private static classInstance?: UserClient;

    private constructor() {
        super()
    }

    public static getInstance() {
        if (!this.classInstance) {
            this.classInstance = new UserClient()
        }
        return this.classInstance
    }

    public getUsers = async () => await this.execute(
        `
         query GetAllUsers {
            users {
                user_id
                fullname
                email
                phone
                password
                isVerified
                passwordResetToken
                passwordResetExpires
            }
        }
        `, {})

    public findOne = async (key: string) => await this.execute(
        `
             query($key:String!) {
                ${USER_TABLE}(where:{
                    _or: [
                        { email: {_eq: $key}},
                        { user_id: {_eq: $key}},
                        { phone: {_eq: $key}}
                    ]
                },limit:1)
                {
                    user_id
                    email
                    user_type
                    isVerified
                    password
                }
            }
        `, { key }
    ).then((response) => response)
        .then(({ users }) => users[0])


    public findUserByEmail = async (email: string) => await this.execute(
        `query GetUser($email:String!,$isVerified:Boolean!) {
                ${USER_TABLE}(where:{
                    _and: [
                        { email: {_eq: $email}},
                        { isVerified: {_eq: $isVerified}}
                    ]
                })
                {
                    user_id
                    email
                    phone
                    isVerified
                }
            }
        `, { "email": email, "isVerified": true }
    ).then(response => response).then(({ users }) => users[0])

    public save = async (user: User) => await this.execute(
        ` 
            mutation ($user_id: String!,$fullname:String!,$email:String!,
                $password:String!,$isVerified:Boolean!,$phone:String,
                $pin:String!,$expires:timestamp,$user_type:String!) {
                    insert_${USER_TABLE}_one(
                        object: {
                                user_id: $user_id,
                                user_type:$user_type,
                                fullname:$fullname,
                                email:$email,
                                password:$password,
                                isVerified:$isVerified,
                                phone:$phone,
                                one_time_pins:{
                                    data:[
                                        {
                                            pin:$pin,
                                            expires:$expires
                                        }
                                    ]
                                }
                            }
                    ){
                            user_id
                            fullname
                            email
                            phone
                            created_at
                    }
                }
        `, { ...user }
    ).then(response => {
        return response
    })
        .then(({ insert_users_one }) => {
            return insert_users_one
        })

    public findUserWithToken = async (pin: string) => {

        return await this.execute(
            `
            query FindUserWithToken($pin:String!){
                ${OTP_TABLE}(where:{pin:{_eq:$pin}},limit:1,order_by:{expires:desc}){
                    expires
                    user{
                        id 
                        user_id
                        fullname
                        phone
                        password
                        email
                        isVerified
                    }
                }
            }
          `, { pin }
        ).then(response => response)
            .then(({ one_time_pins }) => {
                const { user, expires } = one_time_pins[0]
                const expires_in = (new Date(expires)).getTime()
                const now = (new Date()).getTime()
                if (expires_in > now) {
                    return user
                }
                return Promise.reject("expired token given")

            })

    }

    public verifyUser = async (user: any) => {
        const isVerified = true
        const { user_id } = user
        return await this.execute(
            `
            mutation VerifyUser($user_id:String!,$isVerified:Boolean!){
                update_${USER_TABLE}(where:{user_id:{_eq:$user_id}},_set:{
                    isVerified:$isVerified
                }){
                    returning{
                        user_id
                    }
                }
            
            }
            `, { isVerified, user_id }
        )
            .then(response => response)
            .then(({ update_users }) => update_users)
            .then(({ returning }) => {
                const { user_id } = returning
                if (user_id == user_id) {
                    return isVerified
                }
                return Promise.reject("error verifying user")
            })
    }

    public changePassword = async (user: any) => {
        const { password, user_id } = user
        if (!(password && user_id)) {
            return Promise.reject("user_id and password is  required")
        }
        return await this.execute(
            `
                mutation ($user_id:String!,$password:String!){
                    update_${USER_TABLE}(where:{user_id:{_eq:$user_id}},_set:{
                        password:$password
                    })
                    {
                        returning{
                            user_id
                        }
                    }
                 }
            `, { password, user_id }
        ).then(response => response)
            .then(({ update_users }) => update_users)
            .catch(errr => Promise.reject(errr))
    }

}