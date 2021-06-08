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
            this.classInstance = new UserClient();
        }
        return this.classInstance
    }

    public getUsers = async () => await this.runQuuery(`
         query MyQuery {
            users {
                id
                email
                phone
                password
                profile {
                    id
                    verification_id
                    name
                    business_name
                    business_category
                    dob
                    available_for_order
                    gender
                    profile_picture
                    user_id
                    created_at
                }
            }
        }`, {}).then(response => console.log(response))
    public getUser = (id: string) => this.instance.get<User>(`/user/${id}`)
}
