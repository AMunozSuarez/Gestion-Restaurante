import { useRef } from 'react';

const useCommentHandler = (setCart) => {
    const textAreaRefs = useRef({}); // Referencias para las cajas de texto

    // Función para manejar la adición de comentarios
    const handleAddComment = (productId, commentHtml) => {
        const comment = commentHtml
            .replace(/<br\s*\/?>/gi, '\n') // Reemplaza <br> por \n
            .replace(/<\/div>\s*<div>/gi, '\n') // Reemplaza cierre y apertura de <div> por \n
            .replace(/<\/?div>/gi, '') // Elimina etiquetas <div>
            .replace(/&nbsp;/gi, ' ') // Reemplaza espacios no separables (&nbsp;) por espacios normales
            .trim(); // Elimina espacios al inicio y al final

        setCart((prevCart) =>
            prevCart.map((item) =>
                item._id === productId ? { ...item, comment } : item
            )
        );
    };

    // Función para activar o desactivar el modo de edición del comentario
    const handleToggleEditComment = (productId) => {
        setCart((prevCart) =>
            prevCart.map((item) =>
                item._id === productId
                    ? { ...item, isEditing: !item.isEditing } // Alterna el estado de edición
                    : { ...item, isEditing: false } // Desactiva la edición para otros productos
            )
        );

        // Si se activa el modo de edición, enfocar el elemento editable
        setTimeout(() => {
            if (textAreaRefs.current[productId]) {
                const editableDiv = textAreaRefs.current[productId];
                editableDiv.focus();

                // Coloca el cursor al final del texto
                const range = document.createRange();
                const sel = window.getSelection();
                range.selectNodeContents(editableDiv);
                range.collapse(false); // Coloca el cursor al final
                sel.removeAllRanges();
                sel.addRange(range);
            }
        }, 0);
    };

    return { textAreaRefs, handleAddComment, handleToggleEditComment };
};

export default useCommentHandler;