import React from 'react';

export default function SvgDeck() {
    return (
        <svg width={200} height={100} xmlns="http://www.w3.org/2000/svg">
            <path
                d="
          M 0,0
          L 100,0
          A 50,50 0 0 1 100,100
          L 0,100
          Z

          M 20,30
          L 80,30
          L 80,70
          L 20,70
          Z
        "
                fill="#cccccc"
                stroke="#333"
                strokeWidth={2}
                fillRule="evenodd"
            />
        </svg>
    );
}
