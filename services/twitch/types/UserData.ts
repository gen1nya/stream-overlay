export interface UserData {
    user_id: string;
    user_name: string;
    created_at: string;
}

export interface Follower {
    user_id: string;
    user_name: string;
    user_login: string;
    followed_at: string;
}

export interface ModeratorResponse {
    data: UserData[];
    pagination: {
        cursor: string;
    };
}

export interface UsersResponse {
    data: UserData[];
}

export interface FollowerResponse {
    total: number;
    data: Follower[];
    pagination: {
        cursor: string;
    };
}

export interface VipsResponse {
    data: UserData[];
    pagination: {
        cursor: string;
    };
}