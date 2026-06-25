import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import CartEmptyState from '../components/CartEmptyState';
import OrderSuccess from '../components/OrderSuccess';
import ErrorBoundary from '../components/ErrorBoundary';
import CartItemRow from '../components/CartItemRow';
import Header from '../components/Header';
import type { CartItem, MenuItem, User } from '../types';

// ─── CartEmptyState ───

describe('CartEmptyState', () => {
  it('renders empty state message', () => {
    const onClose = vi.fn();
    render(<CartEmptyState onClose={onClose} />);
    expect(screen.getByText('Корзина пуста')).toBeInTheDocument();
    expect(screen.getByText('Вернуться в меню')).toBeInTheDocument();
  });

  it('calls onClose when button clicked', () => {
    const onClose = vi.fn();
    render(<CartEmptyState onClose={onClose} />);
    fireEvent.click(screen.getByText('Вернуться в меню'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ─── OrderSuccess ───

describe('OrderSuccess', () => {
  it('renders success message', () => {
    const onClose = vi.fn();
    render(<OrderSuccess onClose={onClose} />);
    expect(screen.getByText(/заказ оформлен/i)).toBeInTheDocument();
    expect(screen.getByText('Закрыть')).toBeInTheDocument();
  });

  it('calls onClose when button clicked', () => {
    const onClose = vi.fn();
    render(<OrderSuccess onClose={onClose} />);
    fireEvent.click(screen.getByText('Закрыть'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

// ─── ErrorBoundary ───

describe('ErrorBoundary', () => {
  const Bomb = ({ shouldThrow }: { shouldThrow: boolean }) => {
    if (shouldThrow) throw new Error('Test error');
    return <div>Safe content</div>;
  };

  it('renders children when no error', () => {
    const { container } = render(
      <ErrorBoundary>
        <div>Hello</div>
      </ErrorBoundary>,
    );
    expect(container.textContent).toBe('Hello');
  });

  it('catches error and shows fallback', () => {
    // Suppress console.error from React error logging
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Что-то пошло не так')).toBeInTheDocument();
    expect(screen.getByText('Test error')).toBeInTheDocument();
    expect(screen.getByText('Попробовать снова')).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it('retry button resets error state', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const Bomb = () => { throw new Error('Test error'); };

    const { rerender } = render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );

    // Error caught, fallback shown
    expect(screen.getByText('Что-то пошло не так')).toBeInTheDocument();

    // First replace children with safe ones, then click retry
    rerender(
      <ErrorBoundary>
        <div>Recovered</div>
      </ErrorBoundary>,
    );

    fireEvent.click(screen.getByText('Попробовать снова'));

    expect(screen.getByText('Recovered')).toBeInTheDocument();
    consoleSpy.mockRestore();
  });

  it('uses custom fallback when provided', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <Bomb shouldThrow={true} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
    consoleSpy.mockRestore();
  });
});

// ─── CartItemRow ───

const mockCartItem: CartItem = {
  product: {
    id: 'california',
    name: 'Калифорния',
    category: 'rolls',
    subcategory: 'classic',
    price: 599,
    weight: 220,
    pieces: 8,
    image: '/img.jpg',
    composition: ['рис', 'лосось'],
    allergens: ['рыба'],
    isNew: false,
    description: '',
  },
  quantity: 2,
};

describe('CartItemRow', () => {
  it('renders item details', () => {
    render(
      <CartItemRow
        item={mockCartItem}
        onAddToCart={vi.fn()}
        onRemoveFromCart={vi.fn()}
        onClearItem={vi.fn()}
      />,
    );
    expect(screen.getByText('Калифорния')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText(/599 ₽/)).toBeInTheDocument();
  });

  it('calls onAddToCart when plus clicked', () => {
    const onAdd = vi.fn();
    render(
      <CartItemRow
        item={mockCartItem}
        onAddToCart={onAdd}
        onRemoveFromCart={vi.fn()}
        onClearItem={vi.fn()}
      />,
    );
    const plusButtons = screen.getAllByTitle('Добавить');
    fireEvent.click(plusButtons[0]);
    expect(onAdd).toHaveBeenCalledWith('california');
  });

  it('calls onRemoveFromCart when minus clicked', () => {
    const onRemove = vi.fn();
    render(
      <CartItemRow
        item={mockCartItem}
        onAddToCart={vi.fn()}
        onRemoveFromCart={onRemove}
        onClearItem={vi.fn()}
      />,
    );
    const minusButtons = screen.getAllByTitle('Уменьшить');
    fireEvent.click(minusButtons[0]);
    expect(onRemove).toHaveBeenCalledWith('california');
  });
});

// ─── Header ───

describe('Header', () => {
  const mockUser: User = { id: 1, phone: '+79991111111' };
  const defaultProps = {
    user: null as User | null,
    onOpenAuth: vi.fn(),
    onLogout: vi.fn(),
    orderType: 'delivery' as 'delivery' | 'pickup',
    onOrderTypeChange: vi.fn(),
  };

  it('renders logo and brand name', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText('TOKYO')).toBeInTheDocument();
    expect(screen.getByText('ROLLS')).toBeInTheDocument();
  });

  it('shows guest state when no user', () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText('Доставка')).toBeInTheDocument();
  });

  it('shows user phone when logged in', () => {
    render(<Header {...defaultProps} user={mockUser} />);
    expect(screen.getByText('+79991111111')).toBeInTheDocument();
  });

  it('calls onOrderTypeChange when toggling', () => {
    const onChange = vi.fn();
    render(<Header {...defaultProps} onOrderTypeChange={onChange} />);
    const pickupButtons = screen.getAllByText('Самовывоз');
    fireEvent.click(pickupButtons[0]);
    expect(onChange).toHaveBeenCalledWith('pickup');
  });
});
