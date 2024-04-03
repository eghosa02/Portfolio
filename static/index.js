function changeTheme(){
    const checkbox = document.getElementById('changeTheme');
    const root = document.documentElement;
    if (checkbox.checked) {
        root.style.setProperty('--backgroundColor', '#dbd0da');
        root.style.setProperty('--textButtonColor', '#000000');
        root.style.setProperty('--popUpColor', '#00ff00');
        root.style.setProperty('--titlesColor', '#000000');
        root.style.setProperty('--buttonsColor', '#5296c7');
        root.style.setProperty('--textButtonHoverColor', '#000000');
        root.style.setProperty('--linkHoverColor', '#00ff00');
        root.style.setProperty('--linkColor', 'red');
        root.style.setProperty('--textColor', '#000000');
        root.style.setProperty('--headerColor', '#5296c7');

    } else {
        root.style.setProperty('--backgroundColor', '#1a1a1a');
        root.style.setProperty('--textButtonColor', '#202630');
        root.style.setProperty('--popUpColor', '#202020');
        root.style.setProperty('--titlesColor', '#F4DF57');
        root.style.setProperty('--buttonsColor', '#ff9900');
        root.style.setProperty('--textButtonHoverColor', '#f4df57dc');
        root.style.setProperty('--linkHoverColor', '#A1BDDD');
        root.style.setProperty('--linkColor', 'pink');
        root.style.setProperty('--textColor', '#ffffff');
        root.style.setProperty('--headerColor', '#202020');
    }
    callCoockie();
}

function callCoockie()
{

        var selectedOption = document.getElementById('changeTheme').checked;
        fetch('/setTheme', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json' // Specify the content type
            },
            body: JSON.stringify(selectedOption), // Send selected option as POST data
        })
        .then(response => {
            if (response.ok) {
                console.log('Option saved successfully');
            } else {
                console.error('Failed to save option');
            }
        })
        .catch(error => {
            console.error('Error:', error);
        });
}