import React, { useMemo } from 'react';
import styled from 'styled-components';
import { Header } from '../app/SharedStyles';
import { isEffectActive } from '../../utils/seasonalEvents';
import Snowfall from './Snowfall';
import PadoruRunner from './PadoruRunner';

const StyledHeader = styled(Header)`
    position: relative;
    overflow: hidden;
`;

const HeaderContent = styled.div`
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
`;

/**
 * Holiday-aware Header component
 *
 * Wraps the standard Header and adds seasonal effects
 * based on the current date. Effects are automatically
 * enabled/disabled based on event dates.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children - Header content
 * @param {string} [props.className] - Additional CSS class
 */
export default function HolidayHeader({ children, className }) {
    const showSnowfall = useMemo(() => isEffectActive('snowfall'), []);
    const showPadoru = useMemo(() => isEffectActive('padoru'), []);

    return (
        <StyledHeader className={className}>
            {showSnowfall && <Snowfall maxSnowflakes={100} spawnRate={100} />}
            {showPadoru && <PadoruRunner interval={120000} />}
            <HeaderContent>
                {children}
            </HeaderContent>
        </StyledHeader>
    );
}
