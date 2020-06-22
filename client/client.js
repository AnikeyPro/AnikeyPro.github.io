//конектимся к серверу
const sock = io();

sock.on('message',(text)=>{
    writeEv(text);
});

const writeEv =  (text) =>{
    const elem = document.querySelector('#test');
    
    elem.innerHTML = text;

}
