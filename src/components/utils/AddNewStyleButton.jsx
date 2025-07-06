import styled from "styled-components";

const ButtonBackground = styled.div`
    display: flex;
    width: calc(100% - 12px);
    margin-left: 6px;
    margin-right: 6px;
    margin-top: 12px;
    height: 100px;
    justify-content: center;
    align-items: center;
    background: rgba(136, 83, 242, 0.11);
    border: #8853F2 2px dashed;
    border-radius: 12px;
    padding: 0 12px 12px;
    flex-direction: column;
    gap: 12px;
    box-sizing: border-box;
    cursor: pointer;
`;

const Text = styled.div`
    font-size: 1.2rem;
    color: #8853F2;
    font-weight: 400;
    padding-top: 10px;
`;

export default function AddNewStyleButton(
    { onClick = () => {} } = {}
) {

    return (
        <ButtonBackground onClick={onClick}>
            <Text>+ Добавить еще</Text>
        </ButtonBackground>
    )

}