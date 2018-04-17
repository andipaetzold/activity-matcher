export interface DetailedAthlete {
    id: number;
    resource_state: 1 | 2 | 3;
    firstname: string;
    lastname: string;
    profile_medium: string;
    profile: string;
    city: string;
    state: string;
    country: string;
    sex: 'M' | 'F';
    friend: 'pending' | 'accepted' | 'blocked';
    follower: 'pending' | 'accepted' | 'blocked';
    premium: boolean;
    created_at: Date;
    updated_at: Date;
    follower_count: number;
    friend_count: number;
    mutual_friend_count: number;
    measurement_preference: 'feet' | 'meeters';
    email: string;
    ftp: number;
    weight: number;
    // clubs: SummaryClub;
    // bikes: SummaryGear;
    // shoes: SummaryGear;
}