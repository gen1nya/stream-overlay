import { useEffect, useState, useMemo } from "react";
import { getUserById, getUserByLogin, deleteMessage, muteUser } from "../../services/api";
import Popup from "../utils/PopupComponent";
import styled, { keyframes } from "styled-components";
import { TbTrash, TbVolume3, TbBan } from "react-icons/tb";
import { useTranslation } from 'react-i18next';

const shimmer = keyframes`
    0% {
        background-position: -200px 0;
    }
    100% {
        background-position: 200px 0;
    }
`;

const PopupContent = styled.div`
    display: flex;
    flex-direction: column;
    padding: 16px;
    width: 350px;
    gap: 12px;
    background: ${({ $isLight }) =>
        $isLight
            ? 'linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%)'
            : 'linear-gradient(135deg, #1e1e1e 0%, #2a2a2a 100%)'
    };
    border-radius: 12px;
    box-shadow:
        ${({ $isLight }) =>
            $isLight
                ? '0 8px 32px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.1)'
                : '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)'
        };
`;

const UserSection = styled.div`
    display: flex;
    flex-direction: column;
    gap: 10px;
    background: ${({ $isLight }) =>
        $isLight
            ? 'rgba(255, 255, 255, 0.6)'
            : 'rgba(30, 30, 30, 0.5)'
    };
    border: 1px solid ${({ $isLight }) => $isLight ? '#d0d0d0' : '#333'};
    border-radius: 10px;
    padding: 12px;
`;

const UserHeader = styled.div`
    display: flex;
    align-items: center;
    gap: 10px;
`;

const Avatar = styled.img`
    width: 48px;
    height: 48px;
    border-radius: 10px;
    border: 2px solid ${({ $isLight }) => $isLight ? '#d0d0d0' : '#444'};
    box-shadow: 0 4px 12px ${({ $isLight }) =>
        $isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(0, 0, 0, 0.3)'
    };
`;

const Skeleton = styled.div`
    background: ${({ $isLight }) =>
        $isLight
            ? 'linear-gradient(90deg, #e0e0e0 0px, #f0f0f0 40px, #e0e0e0 80px)'
            : 'linear-gradient(90deg, #2a2a2a 0px, #3a3a3a 40px, #2a2a2a 80px)'
    };
    background-size: 200px 100%;
    animation: ${shimmer} 1.5s infinite linear;
    border-radius: ${({ $radius }) => $radius || '4px'};
`;

const AvatarSkeleton = styled(Skeleton)`
    width: 48px;
    height: 48px;
    border-radius: 10px;
    border: 2px solid ${({ $isLight }) => $isLight ? '#d0d0d0' : '#444'};
`;

const UserInfo = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
`;

const UserName = styled.div`
    font-weight: 600;
    font-size: 1.1rem;
    color: ${({ $color }) => $color || '#fff'};
    display: flex;
    align-items: center;
    gap: 6px;
`;

const MetaInfo = styled.div`
    display: flex;
    flex-direction: column;
    gap: 4px;
`;

const MetaItem = styled.div`
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 0.8rem;
    color: ${({ $isLight }) => $isLight ? '#666' : '#999'};

    strong {
        color: ${({ $isLight }) => $isLight ? '#333' : '#d6d6d6'};
        font-weight: 500;
    }
`;

const MetaSkeleton = styled(Skeleton)`
    height: 16px;
    width: ${({ $width }) => $width || '100%'};
`;

const ActionButtons = styled.div`
    display: flex;
    flex-direction: column;
    gap: 8px;
`;

const ActionButton = styled.button`
    background: ${({ $isLight }) => $isLight ? '#e5e5e5' : '#2a2a2a'};
    border: 1px solid ${({ $isLight }) => $isLight ? '#bbb' : '#444'};
    color: ${({ $isLight }) => $isLight ? '#333' : '#fff'};
    padding: 9px 12px;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-size: 13px;
    font-weight: 500;
    transition: all 0.2s ease;
    flex: 1;

    &:hover {
        background: ${({ $isLight }) => $isLight ? '#d5d5d5' : '#333'};
        border-color: ${({ $isLight }) => $isLight ? '#aaa' : '#555'};
        transform: translateY(-1px);
    }

    &.danger {
        background: #dc2626;
        border-color: #dc2626;
        color: #fff;

        &:hover {
            background: #b91c1c;
            border-color: #b91c1c;
        }
    }

    &.warning {
        background: #ea580c;
        border-color: #ea580c;
        color: #fff;

        &:hover {
            background: #c2410c;
            border-color: #c2410c;
        }
    }

    svg {
        width: 16px;
        height: 16px;
    }
`;

const ButtonRow = styled.div`
    display: flex;
    gap: 8px;
`;

const MessagePreview = styled.div`
    background: ${({ $isLight }) =>
        $isLight ? 'rgba(0, 0, 0, 0.05)' : 'rgba(0, 0, 0, 0.3)'
    };
    border: 1px solid ${({ $isLight }) => $isLight ? '#d0d0d0' : '#333'};
    border-radius: 6px;
    padding: 8px;
    font-size: 0.85rem;
    color: ${({ $isLight }) => $isLight ? '#333' : '#ccc'};
    max-height: 60px;
    overflow-y: auto;
    word-wrap: break-word;

    &::-webkit-scrollbar {
        width: 4px;
    }

    &::-webkit-scrollbar-track {
        background: transparent;
    }

    &::-webkit-scrollbar-thumb {
        background: ${({ $isLight }) => $isLight ? '#bbb' : '#444'};
        border-radius: 2px;
    }
`;

/**
 * ModeratorPopup - Popup for moderator actions on chat messages
 * Shows user info and provides moderation buttons
 *
 * @param {Object} message - The chat message object
 * @param {Function} onClose - Callback to close the popup
 * @param {boolean} isLight - Whether light theme is active
 */
export default function ModeratorPopup({ message, onClose, isLight = false }) {
    const { t, i18n } = useTranslation();
    const [userDetails, setUserDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);

    // Extract basic info from message
    const userName = message?.userName || 'Unknown';
    const userId = message?.userId || null;
    const userColor = message?.color || '#fff';
    const messageText = message?.rawMessage || message?.htmlMessage || '';

    const dateLocale = useMemo(() => (i18n.language === 'ru' ? 'ru-RU' : 'en-US'), [i18n.language]);

    useEffect(() => {
        // Try to load additional user details
        const loadUserDetails = async () => {
            try {
                setIsLoading(true);
                let details;

                if (userId) {
                    details = await getUserById(userId);
                } else if (userName && userName !== 'Unknown') {
                    details = await getUserByLogin(userName);
                } else {
                    throw new Error('No user identifier available');
                }

                setUserDetails(details);
                setError(false);
            } catch (err) {
                console.error("Error loading user details:", err);
                setError(true);
            } finally {
                setIsLoading(false);
            }
        };

        loadUserDetails();
    }, [userId, userName]);

    const handleDeleteMessage = async () => {
        const messageId = message?.id;
        if (!messageId) {
            console.error(t('moderatorPopup.errors.noMessageId'));
            return;
        }

        try {
            console.log('Deleting message:', messageId);
            await deleteMessage(messageId);
            console.log('Message deleted successfully');
            onClose(); // Close popup after successful deletion
        } catch (error) {
            console.error(t('moderatorPopup.errors.deleteMessage'), error);
        }
    };

    const handleMute1Min = async () => {
        if (!userId) {
            console.error(t('moderatorPopup.errors.noUserId'));
            return;
        }

        try {
            console.log('Muting user for 1 minute:', userName, userId);
            await muteUser(userId, 'Muted by moderator', 60);
            console.log('User muted successfully');
            onClose(); // Close popup after successful mute
        } catch (error) {
            console.error(t('moderatorPopup.errors.mute'), error);
        }
    };

    const handleBan = async () => {
        if (!userId) {
            console.error(t('moderatorPopup.errors.noUserId'));
            return;
        }

        try {
            console.log('Banning user:', userName, userId);
            // Pass null as duration for permanent ban
            await muteUser(userId, 'Banned by moderator', null);
            console.log('User banned successfully');
            onClose(); // Close popup after successful ban
        } catch (error) {
            console.error(t('moderatorPopup.errors.ban'), error);
        }
    };

    return (
        <Popup onClose={onClose}>
            <PopupContent $isLight={isLight}>
                <UserSection $isLight={isLight}>
                    <UserHeader>
                        {isLoading ? (
                            <AvatarSkeleton $isLight={isLight} />
                        ) : userDetails?.user?.profile_image_url ? (
                            <Avatar
                                src={userDetails.user.profile_image_url}
                                alt={userName}
                                $isLight={isLight}
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                }}
                            />
                        ) : (
                            <AvatarSkeleton $isLight={isLight} />
                        )}

                        <UserInfo>
                            <UserName $color={userColor}>
                                {userName}
                            </UserName>

                            {isLoading ? (
                                <MetaInfo>
                                    <MetaSkeleton $width="150px" $isLight={isLight} />
                                    <MetaSkeleton $width="180px" $isLight={isLight} />
                                </MetaInfo>
                            ) : userDetails ? (
                                <MetaInfo>
                                    <MetaItem $isLight={isLight}>
                                        {t('moderatorPopup.meta.id')}: <strong>{userDetails.user?.id || userId || 'N/A'}</strong>
                                    </MetaItem>
                                    {userDetails.user?.created_at && (
                                        <MetaItem $isLight={isLight}>
                                            {t('moderatorPopup.meta.created')}: <strong>
                                                {new Date(userDetails.user.created_at).toLocaleDateString(dateLocale)}
                                            </strong>
                                        </MetaItem>
                                    )}
                                    {userDetails.followedAt && (
                                        <MetaItem $isLight={isLight}>
                                            {t('moderatorPopup.meta.following')}: <strong>
                                                {new Date(userDetails.followedAt).toLocaleDateString(dateLocale)}
                                            </strong>
                                        </MetaItem>
                                    )}
                                </MetaInfo>
                            ) : error ? (
                                <MetaItem $isLight={isLight} style={{ color: '#dc3545' }}>
                                    {t('moderatorPopup.meta.loadError')}
                                </MetaItem>
                            ) : null}
                        </UserInfo>
                    </UserHeader>

                    {messageText && (
                        <MessagePreview $isLight={isLight}>
                            {messageText}
                        </MessagePreview>
                    )}
                </UserSection>

                <ActionButtons>
                    <ActionButton onClick={handleDeleteMessage} className="danger" $isLight={isLight}>
                        <TbTrash />
                        {t('moderatorPopup.actions.deleteMessage')}
                    </ActionButton>

                    <ButtonRow>
                        <ActionButton onClick={handleMute1Min} className="warning" $isLight={isLight}>
                            <TbVolume3 />
                            {t('moderatorPopup.actions.mute1min')}
                        </ActionButton>

                        <ActionButton onClick={handleBan} className="danger" $isLight={isLight}>
                            <TbBan />
                            {t('moderatorPopup.actions.ban')}
                        </ActionButton>
                    </ButtonRow>
                </ActionButtons>
            </PopupContent>
        </Popup>
    );
}
