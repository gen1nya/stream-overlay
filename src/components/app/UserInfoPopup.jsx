import {useEffect, useState} from "react";
import {getUserById, getUserByLogin, muteUser, unbanUser, updateRoles} from "../../services/api";
import Popup from "../utils/PopupComponent";
import styled from "styled-components";
import {TbDiamond, TbDiamondOff, TbShield, TbShieldPlus, TbShieldX} from "react-icons/tb";

const PopupContent = styled.div`
    display: flex;
    flex-direction: column;
    padding: 16px;
    width: 300px;
    gap: 12px;
    color: white;
`;

const UserHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 12px;
`;

const Avatar = styled.img`
    width: 60px;
    height: 60px;
    border-radius: 8px;
`;

const NameBlock = styled.div`
    display: flex;
    flex-direction: column;
`;

const UserName = styled.div`
    font-weight: bold;
    display: flex;
    gap: 4px;
    font-size: 1.1rem;
`;

const Meta = styled.div`
    font-size: 0.85rem;
    color: #aaa;
`;

const ActionButtons = styled.div`
    display: flex;
    flex-wrap: nowrap;
    gap: 8px;
`;

const Button = styled.button`
    flex: 1 1 45%;
    border: 1px solid #9147ff;
    border-radius: 6px;
    padding: 4px 1px;
    color: white;
    background: transparent;
    cursor: pointer;
    font-size: 0.85rem;
    transition: background 0.2s;

    &:hover {
        background-color: #772ce8;
    }
`;

const PopupTitle = styled.h2`
    margin: 0;
    font-size: 1.6rem;
    color: #d6d6d6;
    font-weight: bold;
`;

const RoleIcon = styled.span`
    display: flex;
    align-items: center;
    font-size: 1.1rem;
    margin-right: 4px;
`;

const UserNameText = styled.span`
    text-decoration: ${({$muted}) => ($muted ? "line-through" : "none")};
    opacity: ${({$muted}) => ($muted ? 0.6 : 1)};
`;

const ModIcon = styled(TbShield)`
    color: #1ba71b; /* Twitch green */
`;

const GiveModIcon = styled(TbShieldPlus)`
    color: #1ba71b; /* Twitch green */
`;

const UnModIcon = styled(TbShieldX)`
    color: #1ba71b;
`;

const UnVIPIcon = styled(TbDiamondOff)`
    color: #e005b9;
`;

const VIPIcon = styled(TbDiamond)`
    color: #e005b9;
`;

export default function UserInfoPopup({userId, userName, onClose}) {
    const [uiModel, setUiModel] = useState({type: "loading", user: undefined});

    const [isMod, setIsMod] = useState(false);
    const [isVIP, setIsVIP] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [muteUntil, setMuteUntil] = useState(null);

    const handleMute = (duration) => {
        const id = uiModel.user?.user?.id;
        if (!id) {
            console.error("User ID is not available for mute operation.");
            return;
        }
        if (isMuted) {
            unbanUser(id)
                .then(r => {
                    console.log("User unmuted successfully:", r);
                    setIsMuted(false);
                    setMuteUntil(null);
                })
                .catch(error => {
                    setIsMuted(true);
                    console.error("Error unmuting user:", error);
                });
        } else {
            muteUser(id, "Muted by moderator", duration)
                .then(r => {
                    console.log("User muted successfully:", r);
                    setIsMuted(true);
                    setMuteUntil(new Date(Date.now() + duration * 1000));
                    setIsMod(false);
                })
                .catch(error => {
                    setIsMuted(false);
                    setMuteUntil(null);
                    console.error("Error muting user:", error);
                });
        }
    }

    const handleRoleToggle = (role) => {
        let update = {};
        if (role === "mod") {
            update = {isMod: !isMod}
        } else if (role === "vip") {
            update = {isVip: !isVIP}
        }
        updateRoles(
            uiModel.user.user.id,
            {
                current: {
                    isMod: isMod,
                    isVip: isVIP
                },
                update: update
            }
        ).then(r => {
            setIsMod(r.isMod);
            setIsVIP(r.isVip);
        }).catch(error => {
            console.error("Error updating user roles:", error);
        })
    }


    useEffect(() => {
        if (userId) {
            getUserById(userId)
                .then((user) => {
                    setUiModel({type: "loaded", user});
                })
                .catch((error) => {
                    console.error("Error fetching user info:", error);
                    setUiModel({type: "error"});
                });
        } else if (userName) {
            getUserByLogin(userName)
                .then((user) => {
                    setUiModel({type: "loaded", user});
                })
                .catch((error) => {
                    console.error("Error fetching user info:", error);
                    setUiModel({type: "error"});
                });
        } else {
            setUiModel({type: "error"});
        }
    }, [userId, userName]);

    useEffect(() => {
        if (uiModel.type === "loaded" && uiModel.user) {
            setIsMod(uiModel.user.isModerator);
            setIsVIP(uiModel.user.isVIP);
            setIsMuted(uiModel.user.isBanned || false);
            setMuteUntil(uiModel.user.banExpiresAt ?? null);
        }
    }, [uiModel]);

    return (
        <Popup onClose={onClose}>
            <PopupContent>
                <PopupTitle>User Info</PopupTitle>

                {uiModel.type === "loading" && <p>Loading...</p>}

                {uiModel.type === "loaded" && uiModel.user && (
                    <>
                        <UserHeader>
                            <Avatar src={uiModel.user.user.profile_image_url} alt="Avatar"/>
                            <NameBlock>
                                <UserName>
                                    {isMod && (
                                        <RoleIcon>
                                            <ModIcon/>
                                        </RoleIcon>
                                    )}
                                    {isVIP && !isMod && (
                                        <RoleIcon>
                                            <VIPIcon/>
                                        </RoleIcon>
                                    )}
                                    <UserNameText $muted={isMuted}>
                                        {uiModel.user.user.display_name}
                                    </UserNameText>
                                    {isMuted && muteUntil && (
                                        <Meta>
                                            мут до:{" "}
                                            {new Date(muteUntil).toLocaleTimeString()}
                                        </Meta>
                                    )}
                                </UserName>
                                <Meta>ID: {uiModel.user.user.id}</Meta>
                                <Meta>
                                    Created:{" "}
                                    {new Date(uiModel.user.user.created_at).toLocaleDateString()}
                                </Meta>
                                {uiModel.user.followedAt && (
                                    <Meta>
                                        Follows since:{" "}
                                        {new Date(uiModel.user.followedAt).toLocaleDateString()}
                                    </Meta>
                                )}
                            </NameBlock>
                        </UserHeader>

                        {/*<Meta>

                        </Meta>*/}

                        <ActionButtons>
                            {isMuted && (
                                <Button onClick={() => handleMute()}>
                                    Unban
                                </Button>
                            )}
                            {!isMuted && (
                                <>
                                    <Button onClick={() => handleMute(60)}>
                                        Mute 1m
                                    </Button>
                                    <Button onClick={() => handleMute(600)}>
                                        Mute 10m
                                    </Button>
                                </>
                            )}

                            <Button onClick={() => handleRoleToggle("vip")}>
                                {isVIP && <UnVIPIcon size={24}/>}
                                {!isVIP && <VIPIcon size={24}/>}
                            </Button>

                            <Button onClick={() => handleRoleToggle("mod")}>
                                {isMod && <UnModIcon size={20}/>}
                                {!isMod && <GiveModIcon size={20}/>}
                            </Button>
                        </ActionButtons>
                    </>
                )}

                {uiModel.type === "error" && <p>Could not load user info.</p>}
            </PopupContent>
        </Popup>
    );
}
