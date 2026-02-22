// Launch page 
import Button from '@mui/material/Button';
import './launch.css';
function Launch() {
    return (
        <div className="launch-container">
            <div className="navbar">
                <div className="title-section">
                    <h1>ProductiviTea!</h1>
                    <img src="/logo.svg" alt="ProductiviTea Logo" className="launch-logo" />
                </div>
            </div>
            <div className="btn-container">
                <Button className="myButtonLogIn"
                    variant="contained"
                    sx={{
                        padding: '10px 20px',
                        bgcolor: '#99836F', // Custom background color
                        '&:hover': {
                            bgcolor: '#746455', // Custom hover background color
                        },
                        '&.Mui-focusVisible': {
                            outline: '2px solid #000000',
                        },
                    }}
                    size="medium">
                    Log-in
                </Button>
                <Button className="myButtonSignUp"
                    variant="contained" sx={{
                        padding: '10px 20px',
                        bgcolor: '#99836F',
                        '&:hover': {
                            bgcolor: '#746455',
                        },
                        '&:focus': {
                            outline: 'none',
                        },
                        '&.Mui-focusVisible': {
                            outline: '2px #000000',
                        },
                    }} >
                    Sign-up
                </Button>
            </div>
            <Button
                className="myButtonLetsGo"
                variant="contained" sx={{
                    padding: '10px 20px',
<<<<<<< HEAD
                    margin: '20px',        
                    marginBottom: '200px',    
                    marginLeft: '500px',
                    bgcolor: '#99836F', // Custom background color
=======
                    bgcolor: '#99836F',
>>>>>>> 3212b6163a118442b99cee5a44c3fc39c0115f52
                    '&:hover': {
                        bgcolor: '#746455',
                    },
                    '&:focus': {
                        outline: 'none',
                    },
                    '&.Mui-focusVisible': {
                        outline: '2px #000000',
                    },
                }} size="medium">Let's go!</Button>
        </div>
    );
}

export default Launch;