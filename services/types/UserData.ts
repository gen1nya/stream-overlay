export interface UserData {
    user_id: string;
    user_name: string;
    created_at: string;
}

export interface UsersResponse {
    data: UserData[];
}