import { response } from "express";
import HttpClient from "./client";
import User from "./types/User";

export default class UserClient extends HttpClient {
    private static classInstance?: UserClient;

    private constructor() {
        super('https://convey-core.herokuapp.com/v1/graphql', {
            "X-Hasura-Admin-Secret": "uAi8w7bI0h40Dmgxl2PvOooaEI1DeNoPtdYn93TjgmJKraHjT3aseuQHOy3aZGCv"
        })
    }

    public static getInstance() {
        if (!this.classInstance) {
            this.classInstance = new UserClient()
        }
        return this.classInstance
    }

    public getUsers = async () => await this.runQuuery(
        `
         query GetAllUsers {
            users {
                fullname
                    email
                    phonenumber
                    password
                    isVerified
                    passwordResetToken
                    passwordResetExpires
            }
        }
        `, {}).then(response => console.log(response))

    public findOne = async (id: string) => await this.runQuuery(
        `
             query GetUser($user_id:String!,status:String!) {
                users(where:_and[{id:{_eq:$user_id}}, {status:$status}],limit:1) 
                {
                    fullname
                    email
                    phonenumber
                    password
                    isVerified
                    passwordResetToken
                    passwordResetExpires
                }
            }
        `, {}
    ).then((response) => {
        if (response.data == null || response.data == undefined) {
            return Promise.reject("error in query")
        }
        if (Array.isArray(response.data.users)) {
            var user: any = response.data.users[0]
            if (user) {
                return user
            }
            return Promise.reject("user not found")
        }
        return Promise.reject("user not found")
    })

    public findByEmail = async (email: string) => await this.runQuuery(
        `query GetUser($email:String!,status:Boolean!) {
                users(where:_and[{email:{_eq:$user_id}}, { isVerified:$status}])
                {
                    fullname
                    email
                    phonenumber                    
                    password
                    isVerified
                    passwordResetToken
                    passwordResetExpires
                }
            }
        `, { "email": email, "isVerified": true }
    )

    public save = async (user: User) => await this.runQuuery(
        ` 
            mutation SaveUser($fullname:String!,$phone:String!,$email:String,$password:String!){
                insert_users_one(object:{ 

                }){
                    id
                    user_id
                    fullname
                    password
                    email
                    phonenumber
                    isVerified

                }
            }
        `, { ...user }
    )

}