import styled from "styled-components";
import FFTDonut from "./FFTDonut";
import React from "react";

const FFTWrapper = styled.div`
    top: 0;
    left: 0;
  width: 500px;
  height: 500px;
  overflow: hidden;
  position: absolute;
  z-index: -1;
  background: transparent;
`;

export default function RoundFFTDemo() {

    return (
        <FFTWrapper>
            <FFTDonut
                bars={256}
                innerRadiusRatio={0.6}
                startAngle={-Math.PI / 2}
                backgroundColor={"rgba(0,0,0,0.00)"}
                peakHold={500}
            />
        </FFTWrapper>
    )
}